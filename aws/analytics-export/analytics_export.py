"""Nightly CampGrids analytics export.

This job deliberately exports an aggregate-friendly, pseudonymous copy. It
does not write names, usernames, emails, guardian details, Cognito subjects,
class codes, notes, or JSON metadata to analytics storage or Redshift.
"""

from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import logging
import os
import ssl
import time
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any, Iterable

import boto3
import pg8000.dbapi


LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)


@lru_cache
def aws_client(service_name: str):
    """Create clients only during invocation, after Lambda has set AWS_REGION."""
    return boto3.client(service_name)


@lru_cache
def secret(secret_arn: str) -> dict[str, str]:
    response = aws_client("secretsmanager").get_secret_value(SecretId=secret_arn)
    return json.loads(response["SecretString"])


def keyed_identifier(value: object, hmac_key: str) -> str:
    return hmac.new(hmac_key.encode("utf-8"), str(value).encode("utf-8"), hashlib.sha256).hexdigest()


def iso(value: object | None) -> str:
    if value is None:
        return ""
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def csv_bytes(fieldnames: list[str], rows: Iterable[dict[str, str]]) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def write_object(bucket: str, key: str, body: bytes) -> dict[str, object]:
    aws_client("s3").put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType="text/csv",
        ServerSideEncryption="aws:kms",
    )
    return {"url": f"s3://{bucket}/{key}", "mandatory": True}


def write_manifest(bucket: str, key: str, entry: dict[str, object]) -> str:
    aws_client("s3").put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps({"entries": [entry]}, separators=(",", ":")).encode("utf-8"),
        ContentType="application/json",
        ServerSideEncryption="aws:kms",
    )
    return f"s3://{bucket}/{key}"


def execute_batch_and_wait(statements: list[str]) -> None:
    """Run the staging/replacement statements as one Redshift transaction."""
    redshift = aws_client("redshift-data")
    response = redshift.batch_execute_statement(
        WorkgroupName=os.environ["REDSHIFT_WORKGROUP"],
        Database=os.environ["REDSHIFT_DATABASE"],
        SecretArn=os.environ["REDSHIFT_SECRET_ARN"],
        Sqls=statements,
    )
    statement_id = response["Id"]
    deadline = time.monotonic() + 840
    while time.monotonic() < deadline:
        status = redshift.describe_statement(Id=statement_id)
        state = status["Status"]
        if state == "FINISHED":
            return
        if state in {"FAILED", "ABORTED"}:
            raise RuntimeError(status.get("Error", "Redshift statement did not finish"))
        time.sleep(2)
    raise TimeoutError("Timed out waiting for Redshift Data API statement")


def handler(_event: dict[str, Any], _context: Any) -> dict[str, object]:
    database = secret(os.environ["DB_SECRET_ARN"])
    hmac_key = secret(os.environ["HMAC_SECRET_ARN"])["key"]
    exported_at = datetime.now(UTC)
    run_prefix = f"exports/{exported_at:%Y-%m-%d}/{exported_at:%H%M%S}"
    bucket = os.environ["ANALYTICS_BUCKET"]
    connection = pg8000.dbapi.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", "5432")),
        database=os.environ.get("DB_NAME", "campgrids"),
        user=database["username"],
        password=database["password"],
        ssl_context=ssl.create_default_context(),
        timeout=10,
    )
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            select id, role::text, is_active, created_at, updated_at, deactivated_at
            from campgrids.accounts
            order by id
            """
        )
        account_rows = [
            {
                "account_key": keyed_identifier(row[0], hmac_key),
                "role": row[1],
                "is_active": str(bool(row[2])).lower(),
                "created_at": iso(row[3]),
                "updated_at": iso(row[4]),
                "deactivated_at": iso(row[5]),
                "exported_at": iso(exported_at),
            }
            for row in cursor.fetchall()
        ]
        cursor.execute(
            """
            select id, account_id, actor_id, event_type, occurred_at
            from campgrids.account_audit_events
            order by id
            """
        )
        event_rows = [
            {
                "event_key": keyed_identifier(row[0], hmac_key),
                "account_key": keyed_identifier(row[1], hmac_key) if row[1] else "",
                "actor_key": keyed_identifier(row[2], hmac_key) if row[2] else "",
                "event_type": row[3],
                "occurred_at": iso(row[4]),
                "exported_at": iso(exported_at),
            }
            for row in cursor.fetchall()
        ]
    finally:
        connection.close()

    account_entry = write_object(
        bucket,
        f"{run_prefix}/accounts.csv",
        csv_bytes(
            ["account_key", "role", "is_active", "created_at", "updated_at", "deactivated_at", "exported_at"],
            account_rows,
        ),
    )
    event_entry = write_object(
        bucket,
        f"{run_prefix}/account-events.csv",
        csv_bytes(
            ["event_key", "account_key", "actor_key", "event_type", "occurred_at", "exported_at"],
            event_rows,
        ),
    )
    account_manifest = write_manifest(bucket, f"{run_prefix}/accounts.manifest", account_entry)
    event_manifest = write_manifest(bucket, f"{run_prefix}/account-events.manifest", event_entry)
    copy_role = os.environ["REDSHIFT_COPY_ROLE_ARN"]
    execute_batch_and_wait([
        "create temp table stage_account (like analytics.dim_account)",
        f"copy stage_account from '{account_manifest}' iam_role '{copy_role}' manifest csv ignoreheader 1 timeformat 'auto'",
        "truncate analytics.dim_account",
        "insert into analytics.dim_account select * from stage_account",
        "create temp table stage_event (like analytics.fact_account_event)",
        f"copy stage_event from '{event_manifest}' iam_role '{copy_role}' manifest csv ignoreheader 1 timeformat 'auto'",
        "delete from analytics.fact_account_event target using stage_event source where target.event_key = source.event_key",
        "insert into analytics.fact_account_event select * from stage_event",
    ])
    LOGGER.info("Analytics export completed: accounts=%s events=%s", len(account_rows), len(event_rows))
    return {"accounts": len(account_rows), "events": len(event_rows), "prefix": run_prefix}

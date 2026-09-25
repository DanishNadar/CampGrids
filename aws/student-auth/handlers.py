"""Cognito custom-auth handlers for CampGrids students.

The browser submits the class code as the Cognito custom-challenge answer.
Only a confirmed Cognito student can start the challenge; this function then
checks that the Cognito subject has an *active* CampGrids enrolment in RDS. A
class code does not become a password, is never logged, and is never written to
the challenge's public or private parameters.
"""

from __future__ import annotations

import json
import logging
import os
import re
import ssl
from functools import lru_cache
from typing import Any

import boto3
import pg8000.dbapi


LOGGER = logging.getLogger()
LOGGER.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
CLASS_CODE = re.compile(r"^[A-Z0-9]{7,12}$")


@lru_cache
def database_secret() -> dict[str, str]:
    """Fetch once per warm Lambda environment; never put it in a log message."""
    secret_id = os.environ["DB_SECRET_ARN"]
    response = boto3.client("secretsmanager").get_secret_value(SecretId=secret_id)
    return json.loads(response["SecretString"])


def define_auth_challenge(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """Ask one class-code challenge, issue tokens only after a correct result."""
    session = event["request"].get("session", [])
    response = event["response"]

    if not session:
        response["challengeName"] = "CUSTOM_CHALLENGE"
        response["issueTokens"] = False
        response["failAuthentication"] = False
        return event

    last = session[-1]
    if last.get("challengeName") == "CUSTOM_CHALLENGE" and last.get("challengeResult") is True:
        response["issueTokens"] = True
        response["failAuthentication"] = False
        return event

    # One incorrect answer ends the flow. This deliberately avoids turning the
    # class-code form into an unlimited anonymous guessing endpoint.
    response["issueTokens"] = False
    response["failAuthentication"] = True
    return event


def create_auth_challenge(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """Return a generic prompt; no class or account data leaves the server."""
    response = event["response"]
    response["publicChallengeParameters"] = {
        "prompt": "Enter your CampGrids class code.",
    }
    response["privateChallengeParameters"] = {}
    response["challengeMetadata"] = "campgrids-class-code-v1"
    return event


def verify_auth_challenge_response(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """Verify an active student/class relationship without exposing lookup state."""
    answer = str(event["request"].get("challengeAnswer") or "").strip().upper()
    subject = str(event["request"].get("userAttributes", {}).get("sub") or "")

    if not subject or not CLASS_CODE.fullmatch(answer):
        event["response"]["answerCorrect"] = False
        return event

    secret = database_secret()
    connection = None
    try:
        connection = pg8000.dbapi.connect(
            host=os.environ["DB_HOST"],
            port=int(os.environ.get("DB_PORT", "5432")),
            database=os.environ.get("DB_NAME", "campgrids"),
            user=secret["username"],
            password=secret["password"],
            ssl_context=ssl.create_default_context(),
            timeout=8,
        )
        cursor = connection.cursor()
        cursor.execute(
            """
            select exists (
              select 1
              from campgrids.accounts account
              join campgrids.class_enrolments enrolment
                on enrolment.student_id = account.id
               and enrolment.exited_at is null
              join campgrids.classes class
                on class.id = enrolment.class_id
               and class.status = 'active'
              where account.cognito_sub::text = %s
                and account.role = 'student'
                and account.is_active = true
                and class.code = %s
            )
            """,
            (subject, answer),
        )
        event["response"]["answerCorrect"] = bool(cursor.fetchone()[0])
    except Exception:
        # Cognito receives only a failed challenge; detailed context belongs in
        # CloudWatch and must not contain a class code or database credential.
        LOGGER.exception("Student challenge verification failed")
        event["response"]["answerCorrect"] = False
    finally:
        if connection is not None:
            connection.close()
    return event

"""CampGrids account API for a private EC2 deployment.

This service deliberately exposes a small account boundary. Cognito owns
credentials and MFA; RDS owns profile data and authorization. A browser never
receives an RDS or Redshift credential and Redshift is not queried here.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from functools import lru_cache
from typing import Annotated, Literal
from uuid import UUID

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


class Settings(BaseSettings):
    """Runtime configuration. Values must be injected outside source control."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    aws_region: str
    cognito_user_pool_id: str
    cognito_app_client_id: str
    cors_allowed_origins: str
    log_level: str = "INFO"

    @property
    def issuer(self) -> str:
        return f"https://cognito-idp.{self.aws_region}.amazonaws.com/{self.cognito_user_pool_id}"

    @property
    def jwks_url(self) -> str:
        return f"{self.issuer}/.well-known/jwks.json"

    @property
    def allowed_origins(self) -> list[str]:
        origins = [origin.strip().rstrip("/") for origin in self.cors_allowed_origins.split(",") if origin.strip()]
        if not origins or "*" in origins:
            raise RuntimeError("CORS_ALLOWED_ORIGINS must be a non-empty, explicit origin list")
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_jwk_client(jwks_url: str) -> jwt.PyJWKClient:
    """Cache Cognito's signing keys instead of downloading the JWKS per request."""
    return jwt.PyJWKClient(jwks_url)


class Principal(BaseModel):
    cognito_sub: UUID


class Account(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: Literal["student", "teacher", "admin"]
    username: str
    email: str | None
    first_name: str
    last_name: str
    is_active: bool


class AccountPatch(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)

    @model_validator(mode="after")
    def require_a_change(self) -> "AccountPatch":
        if self.first_name is None and self.last_name is None:
            raise ValueError("Provide a first_name or last_name")
        return self

    def clean(self, field: str) -> str | None:
        value = getattr(self, field)
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise HTTPException(status_code=422, detail=f"{field} cannot be blank")
        return value


class AccountStore:
    def __init__(self, pool: ConnectionPool):
        self.pool = pool

    def healthcheck(self) -> None:
        with self.pool.connection() as connection, connection.cursor() as cursor:
            cursor.execute("select 1")
            cursor.fetchone()

    def account_for_subject(self, cognito_sub: UUID) -> dict:
        with self.pool.connection() as connection, connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                select id, role::text, username::text, email::text, first_name, last_name, is_active
                from campgrids.accounts
                where cognito_sub = %s and is_active = true
                """,
                (cognito_sub,),
            )
            account = cursor.fetchone()
        if not account:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This CampGrids account is inactive or not provisioned")
        return account

    def update_self(self, cognito_sub: UUID, patch: AccountPatch) -> dict:
        first_name, last_name = patch.clean("first_name"), patch.clean("last_name")
        with self.pool.connection() as connection, connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                update campgrids.accounts
                set first_name = coalesce(%s, first_name),
                    last_name = coalesce(%s, last_name)
                where cognito_sub = %s and is_active = true
                returning id, role::text, username::text, email::text, first_name, last_name, is_active
                """,
                (first_name, last_name, cognito_sub),
            )
            account = cursor.fetchone()
            if not account:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This CampGrids account is inactive or not provisioned")
            cursor.execute(
                """
                insert into campgrids.account_audit_events (account_id, actor_id, event_type, metadata)
                values (%s, %s, 'account_profile_updated', '{}'::jsonb)
                """,
                (account["id"], account["id"]),
            )
            connection.commit()
        return account


def get_store() -> AccountStore:
    return app.state.store


def get_principal(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="A bearer token is required")
    try:
        token = authorization.removeprefix("Bearer ").strip()
        signing_key = get_jwk_client(settings.jwks_url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.issuer,
            options={"verify_aud": False, "require": ["exp", "iat", "sub", "token_use"]},
        )
        if claims["token_use"] == "id":
            client_matches = claims.get("aud") == settings.cognito_app_client_id
        elif claims["token_use"] == "access":
            client_matches = claims.get("client_id") == settings.cognito_app_client_id
        else:
            client_matches = False
        if not client_matches:
            raise ValueError("Token was issued for a different client")
        return Principal(cognito_sub=UUID(claims["sub"]))
    except (jwt.PyJWTError, ValueError) as error:
        logging.getLogger(__name__).info("Rejected account API token: %s", error)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="The access token is invalid or expired") from error


@asynccontextmanager
async def lifespan(application: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    pool = ConnectionPool(conninfo=settings.database_url, min_size=1, max_size=8, open=True)
    application.state.store = AccountStore(pool)
    try:
        application.state.store.healthcheck()
        yield
    finally:
        pool.close()


app = FastAPI(title="CampGrids Account API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health", status_code=status.HTTP_204_NO_CONTENT)
def health(store: AccountStore = Depends(get_store)) -> None:
    """ALB health check; no identity or database details are returned."""
    store.healthcheck()


@app.get("/v1/accounts/me", response_model=Account)
def get_my_account(
    principal: Principal = Depends(get_principal),
    store: AccountStore = Depends(get_store),
) -> dict:
    return store.account_for_subject(principal.cognito_sub)


@app.patch("/v1/accounts/me", response_model=Account)
def update_my_account(
    patch: AccountPatch,
    principal: Principal = Depends(get_principal),
    store: AccountStore = Depends(get_store),
) -> dict:
    """Only display names are self-service; identity, role, and activity state are staff-controlled."""
    return store.update_self(principal.cognito_sub, patch)

import os
from typing import Any

from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set.")

pool = ConnectionPool(conninfo=DATABASE_URL, kwargs={"row_factory": dict_row})


def find_user_by_email(email: str) -> dict[str, Any] | None:
    query = """
        SELECT id, first_name, last_name, email, password_hash, created_at
        FROM users
        WHERE email = %s
    """

    with pool.connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (email,))
            return cursor.fetchone()


def create_user(
    first_name: str, last_name: str, email: str, password_hash: str
) -> dict[str, Any]:
    query = """
        INSERT INTO users (first_name, last_name, email, password_hash)
        VALUES (%s, %s, %s, %s)
        RETURNING id, first_name, last_name, email, created_at
    """

    with pool.connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                query, (first_name, last_name, email, password_hash)
            )
            user = cursor.fetchone()
        connection.commit()

    return user


def upsert_email_otp(
    email: str,
    purpose: str,
    otp_hash: str,
    expires_at_minutes: int,
) -> dict[str, Any]:
    query = """
        INSERT INTO email_otps (email, purpose, otp_hash, expires_at)
        VALUES (
            %s,
            %s,
            %s,
            NOW() + (%s * INTERVAL '1 minute')
        )
        ON CONFLICT (email, purpose)
        DO UPDATE SET
            otp_hash = EXCLUDED.otp_hash,
            expires_at = EXCLUDED.expires_at,
            verified_at = NULL,
            consumed_at = NULL,
            attempt_count = 0,
            updated_at = NOW()
        RETURNING id, email, purpose, expires_at, verified_at, consumed_at
    """

    with pool.connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (email, purpose, otp_hash, expires_at_minutes))
            otp_record = cursor.fetchone()
        connection.commit()

    return otp_record


def find_active_otp(email: str, purpose: str) -> dict[str, Any] | None:
    query = """
        SELECT id, email, purpose, otp_hash, expires_at, verified_at, consumed_at,
               attempt_count, created_at, updated_at
        FROM email_otps
        WHERE email = %s
          AND purpose = %s
          AND consumed_at IS NULL
    """

    with pool.connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (email, purpose))
            return cursor.fetchone()


def increment_otp_attempts(otp_id: int) -> None:
    query = """
        UPDATE email_otps
        SET attempt_count = attempt_count + 1,
            updated_at = NOW()
        WHERE id = %s
    """

    with pool.connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (otp_id,))
        connection.commit()


def mark_otp_verified(otp_id: int) -> dict[str, Any] | None:
    query = """
        UPDATE email_otps
        SET verified_at = NOW(),
            updated_at = NOW()
        WHERE id = %s
        RETURNING id, email, purpose, verified_at, consumed_at
    """

    with pool.connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (otp_id,))
            verified_record = cursor.fetchone()
        connection.commit()

    return verified_record


def consume_otp(otp_id: int) -> dict[str, Any] | None:
    query = """
        UPDATE email_otps
        SET consumed_at = NOW(),
            updated_at = NOW()
        WHERE id = %s
        RETURNING id, email, purpose, verified_at, consumed_at
    """

    with pool.connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (otp_id,))
            consumed_record = cursor.fetchone()
        connection.commit()

    return consumed_record

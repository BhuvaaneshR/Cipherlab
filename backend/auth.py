import re
from datetime import datetime, timezone

import bcrypt
from flask import Blueprint, jsonify, request

from database import (
    consume_otp,
    create_user,
    find_active_otp,
    find_user_by_email,
    increment_otp_attempts,
    mark_otp_verified,
    upsert_email_otp,
)
from otp_service import (
    OTP_EXPIRY_MINUTES,
    generate_otp,
    get_otp_debug_payload,
    hash_otp,
    send_otp_email,
)

auth_blueprint = Blueprint("auth", __name__)

EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
NAME_PATTERN = re.compile(r"^[A-Za-z]+$")
OTP_PATTERN = re.compile(r"^\d{6}$")
REGISTER_OTP_PURPOSE = "register"
LOGIN_OTP_PURPOSE = "login"


def _validate_register_payload(payload: dict[str, str]) -> list[str]:
    errors: list[str] = []

    first_name = payload.get("first_name", "").strip()
    last_name = payload.get("last_name", "").strip()
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not first_name or not NAME_PATTERN.fullmatch(first_name):
        errors.append("First name is required and must contain letters only.")

    if not last_name or not NAME_PATTERN.fullmatch(last_name):
        errors.append("Last name is required and must contain letters only.")

    if not email or not EMAIL_PATTERN.fullmatch(email):
        errors.append("A valid email address is required.")

    if not password:
        errors.append("Password is required.")

    return errors


def _validate_login_payload(payload: dict[str, str]) -> list[str]:
    errors: list[str] = []

    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not EMAIL_PATTERN.fullmatch(email):
        errors.append("A valid email address is required.")

    if not password:
        errors.append("Password is required.")

    return errors


def _validate_otp_request_payload(payload: dict[str, str]) -> list[str]:
    errors: list[str] = []

    email = payload.get("email", "").strip().lower()

    if not email or not EMAIL_PATTERN.fullmatch(email):
        errors.append("A valid email address is required.")

    return errors


def _validate_register_otp_request_payload(payload: dict[str, str]) -> list[str]:
    errors = _validate_otp_request_payload(payload)
    first_name = payload.get("first_name", "").strip()
    last_name = payload.get("last_name", "").strip()

    if not first_name or not NAME_PATTERN.fullmatch(first_name):
        errors.append("First name is required and must contain letters only.")

    if not last_name or not NAME_PATTERN.fullmatch(last_name):
        errors.append("Last name is required and must contain letters only.")

    return errors


def _validate_otp_verification_payload(payload: dict[str, str]) -> list[str]:
    errors = _validate_otp_request_payload(payload)
    otp = payload.get("otp", "").strip()

    if not otp or not OTP_PATTERN.fullmatch(otp):
        errors.append("A valid 6-digit OTP is required.")

    return errors


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _otp_expired(otp_record: dict[str, object]) -> bool:
    expires_at = otp_record["expires_at"]
    if isinstance(expires_at, datetime):
        return expires_at <= _utc_now()
    return True


def _issue_otp(
    email: str, purpose: str, first_name: str, last_name: str
) -> tuple[dict[str, object], int]:
    otp = generate_otp()
    otp_hash = hash_otp(email, purpose, otp)
    upsert_email_otp(
        email=email,
        purpose=purpose,
        otp_hash=otp_hash,
        expires_at_minutes=OTP_EXPIRY_MINUTES,
    )
    send_otp_email(email, otp, purpose, first_name, last_name)

    response = {
        "success": True,
        "message": f"OTP sent successfully for {purpose}.",
        "email": email,
        "purpose": purpose,
        "expires_in_minutes": OTP_EXPIRY_MINUTES,
        **get_otp_debug_payload(otp),
    }
    return response, 200


def _verify_otp(
    email: str, purpose: str, otp: str, consume_on_success: bool = False
) -> tuple[dict[str, object], int]:
    otp_record = find_active_otp(email, purpose)

    if not otp_record:
        return (
            {
                "success": False,
                "errors": ["No OTP request found for this email and purpose."],
            },
            404,
        )

    if _otp_expired(otp_record):
        return (
            {
                "success": False,
                "errors": ["OTP has expired. Please request a new OTP."],
            },
            410,
        )

    submitted_hash = hash_otp(email, purpose, otp)
    if submitted_hash != otp_record["otp_hash"]:
        increment_otp_attempts(otp_record["id"])
        return (
            {"success": False, "errors": ["Invalid OTP entered."]},
            401,
        )

    mark_otp_verified(otp_record["id"])
    if consume_on_success:
        consume_otp(otp_record["id"])
    return (
        {
            "success": True,
            "message": "OTP verified successfully.",
            "email": email,
            "purpose": purpose,
        },
        200,
    )


@auth_blueprint.post("/register/request-otp")
def request_register_otp():
    payload = request.get_json(silent=True) or {}
    errors = _validate_register_otp_request_payload(payload)

    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    email = payload["email"].strip().lower()

    existing_user = find_user_by_email(email)
    if existing_user:
        return (
            jsonify(
                {
                    "success": False,
                    "errors": ["An account already exists for this email."],
                }
            ),
            409,
        )

    response, status_code = _issue_otp(
        email,
        REGISTER_OTP_PURPOSE,
        payload["first_name"].strip(),
        payload["last_name"].strip(),
    )
    return jsonify(response), status_code


@auth_blueprint.post("/register/verify-otp")
def verify_register_otp():
    payload = request.get_json(silent=True) or {}
    errors = _validate_otp_verification_payload(payload)

    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    response, status_code = _verify_otp(
        email=payload["email"].strip().lower(),
        purpose=REGISTER_OTP_PURPOSE,
        otp=payload["otp"].strip(),
        consume_on_success=False,
    )
    return jsonify(response), status_code


@auth_blueprint.post("/login/request-otp")
def request_login_otp():
    payload = request.get_json(silent=True) or {}
    errors = _validate_login_payload(payload)

    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    email = payload["email"].strip().lower()
    password = payload["password"]
    user = find_user_by_email(email)

    if not user:
        return (
            jsonify({"success": False, "errors": ["Invalid email or password."]}),
            401,
        )

    password_hash = user["password_hash"].encode("utf-8")
    if not bcrypt.checkpw(password.encode("utf-8"), password_hash):
        return (
            jsonify({"success": False, "errors": ["Invalid email or password."]}),
            401,
        )

    response, status_code = _issue_otp(
        email,
        LOGIN_OTP_PURPOSE,
        user["first_name"],
        user["last_name"],
    )
    return jsonify(response), status_code


@auth_blueprint.post("/login/verify-otp")
def verify_login_otp():
    payload = request.get_json(silent=True) or {}
    errors = _validate_otp_verification_payload(payload)

    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    email = payload["email"].strip().lower()
    response, status_code = _verify_otp(
        email=email,
        purpose=LOGIN_OTP_PURPOSE,
        otp=payload["otp"].strip(),
        consume_on_success=True,
    )

    if status_code != 200:
        return jsonify(response), status_code

    user = find_user_by_email(email)
    return (
        jsonify(
            {
                **response,
                "user": {
                    "id": user["id"],
                    "first_name": user["first_name"],
                    "last_name": user["last_name"],
                    "email": user["email"],
                },
            }
        ),
        200,
    )


@auth_blueprint.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    errors = _validate_register_payload(payload)

    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    email = payload["email"].strip().lower()

    otp = payload.get("otp", "").strip()
    otp_errors = []
    if not otp or not OTP_PATTERN.fullmatch(otp):
        otp_errors.append("A valid 6-digit OTP is required before registration.")

    if otp_errors:
        return jsonify({"success": False, "errors": otp_errors}), 400

    existing_user = find_user_by_email(email)
    if existing_user:
        return (
            jsonify(
                {
                    "success": False,
                    "errors": ["An account already exists for this email."],
                }
            ),
            409,
        )

    otp_record = find_active_otp(email, REGISTER_OTP_PURPOSE)
    if not otp_record:
        return (
            jsonify(
                {
                    "success": False,
                    "errors": ["No OTP request found for this email and purpose."],
                }
            ),
            404,
        )

    if _otp_expired(otp_record):
        return (
            jsonify(
                {
                    "success": False,
                    "errors": ["OTP has expired. Please request a new OTP."],
                }
            ),
            410,
        )

    if not otp_record["verified_at"]:
        otp_verification_response, otp_status_code = _verify_otp(
            email=email,
            purpose=REGISTER_OTP_PURPOSE,
            otp=otp,
            consume_on_success=False,
        )

        if otp_status_code != 200:
            return jsonify(otp_verification_response), otp_status_code
    else:
        submitted_hash = hash_otp(email, REGISTER_OTP_PURPOSE, otp)
        if submitted_hash != otp_record["otp_hash"]:
            return (
                jsonify({"success": False, "errors": ["Invalid OTP entered."]}),
                401,
            )

    consume_otp(otp_record["id"])

    password_hash = bcrypt.hashpw(
        payload["password"].encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    user = create_user(
        first_name=payload["first_name"].strip(),
        last_name=payload["last_name"].strip(),
        email=email,
        password_hash=password_hash,
    )

    return (
        jsonify(
            {
                "success": True,
                "message": "Profile created successfully.",
                "user": user,
            }
        ),
        201,
    )


@auth_blueprint.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    errors = _validate_login_payload(payload)

    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    email = payload["email"].strip().lower()
    password = payload["password"]

    user = find_user_by_email(email)
    if not user:
        return (
            jsonify({"success": False, "errors": ["Invalid email or password."]}),
            401,
        )

    password_hash = user["password_hash"].encode("utf-8")
    password_matches = bcrypt.checkpw(password.encode("utf-8"), password_hash)

    if not password_matches:
        return (
            jsonify({"success": False, "errors": ["Invalid email or password."]}),
            401,
        )

    return (
        jsonify(
            {
                "success": True,
                "message": "Password verified. Request OTP to complete login.",
                "email": email,
            }
        ),
        200,
    )

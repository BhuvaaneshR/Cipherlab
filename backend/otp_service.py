import hashlib
import os
import random
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
OTP_DELIVERY_MODE = os.getenv("OTP_DELIVERY_MODE", "console").lower()
OTP_SECRET = os.getenv("OTP_SECRET", "cipherlab-dev-otp-secret")
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_SENDER = os.getenv("SMTP_SENDER", SMTP_USERNAME or "no-reply@cipherlab.local")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
SMTP_TIMEOUT_SECONDS = int(os.getenv("SMTP_TIMEOUT_SECONDS", "15"))


def generate_otp() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(OTP_LENGTH))


def hash_otp(email: str, purpose: str, otp: str) -> str:
    payload = f"{email.lower()}:{purpose}:{otp}:{OTP_SECRET}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def send_otp_email(email: str, otp: str, purpose: str) -> None:
    subject = "CipherLab OTP Verification"
    body = (
        f"Your CipherLab OTP for {purpose} is {otp}. "
        f"It will expire in {OTP_EXPIRY_MINUTES} minutes."
    )

    if OTP_DELIVERY_MODE == "console":
        print(f"[CipherLab OTP] email={email} purpose={purpose} otp={otp}")
        return

    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP credentials are not configured. "
            "Set OTP_DELIVERY_MODE=console for local development or provide SMTP settings."
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_SENDER
    message["To"] = email
    message.set_content(body)
    message.add_alternative(
        f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>CipherLab OTP Verification</h2>
            <p>Your OTP for <strong>{purpose}</strong> is:</p>
            <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{otp}</p>
            <p>This OTP will expire in {OTP_EXPIRY_MINUTES} minutes.</p>
          </body>
        </html>
        """,
        subtype="html",
    )

    smtp_class = smtplib.SMTP_SSL if SMTP_USE_SSL else smtplib.SMTP

    with smtp_class(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS) as smtp:
        if SMTP_USE_TLS and not SMTP_USE_SSL:
            smtp.starttls()
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)


def get_otp_debug_payload(otp: str) -> dict[str, str]:
    if OTP_DELIVERY_MODE == "console":
        return {"development_otp": otp}

    return {}

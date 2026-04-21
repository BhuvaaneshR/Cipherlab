import base64
import hashlib
import math
import secrets
import time
from dataclasses import dataclass

import bcrypt
from flask import Blueprint, jsonify, request

analysis_blueprint = Blueprint("analysis", __name__)

SUPPORTED_ALGORITHMS = {"bcrypt", "argon2", "pbkdf2", "sha256"}


@dataclass(frozen=True)
class AlgorithmProfile:
    hash_speed_label: str
    memory_usage: str
    security_level: str
    attacks_resisted: list[str]


ALGORITHM_PROFILES = {
    "bcrypt": AlgorithmProfile(
        hash_speed_label="Deliberately slow",
        memory_usage="Low",
        security_level="High",
        attacks_resisted=["Brute force", "Credential stuffing follow-up"],
    ),
    "argon2": AlgorithmProfile(
        hash_speed_label="Slow and memory hard",
        memory_usage="High",
        security_level="Very High",
        attacks_resisted=["GPU cracking", "ASIC cracking", "Brute force"],
    ),
    "pbkdf2": AlgorithmProfile(
        hash_speed_label="Configurable and CPU hard",
        memory_usage="Low",
        security_level="High",
        attacks_resisted=["Brute force", "Offline guessing"],
    ),
    "sha256": AlgorithmProfile(
        hash_speed_label="Very fast",
        memory_usage="Very Low",
        security_level="Low for password storage",
        attacks_resisted=["Integrity checks only"],
    ),
}


def _validate_payload(payload: dict) -> list[str]:
    errors: list[str] = []
    password = payload.get("password", "")
    algorithm = payload.get("algorithm", "").lower()

    if not password:
        errors.append("Password is required.")

    if algorithm not in SUPPORTED_ALGORITHMS:
        errors.append("A supported algorithm is required.")

    return errors


def _generate_salt(salt_length: int) -> tuple[str, bytes]:
    salt_bytes = secrets.token_bytes(max(8, min(salt_length, 32)))
    return base64.urlsafe_b64encode(salt_bytes).decode("utf-8"), salt_bytes


def _estimate_charset(password: str) -> int:
    charset = 0
    if any(character.islower() for character in password):
        charset += 26
    if any(character.isupper() for character in password):
        charset += 26
    if any(character.isdigit() for character in password):
        charset += 10
    if any(not character.isalnum() for character in password):
        charset += 32
    return max(charset, 1)


def _estimate_entropy(password: str) -> float:
    charset = _estimate_charset(password)
    return round(len(password) * math.log2(charset), 2)


def _format_duration(seconds: float) -> str:
    if seconds < 1:
        return "Less than a second"
    if seconds < 60:
        return f"{seconds:.1f} seconds"
    minutes = seconds / 60
    if minutes < 60:
        return f"{minutes:.1f} minutes"
    hours = minutes / 60
    if hours < 24:
        return f"{hours:.1f} hours"
    days = hours / 24
    if days < 365:
        return f"{days:.1f} days"
    years = days / 365
    return f"{years:.1f} years"


def _hash_password(
    password: str,
    algorithm: str,
    salt_bytes: bytes,
    cost_factor: int,
    iterations: int,
    memory_cost: int,
    parallelism: int,
) -> tuple[str, float]:
    start = time.perf_counter()

    if algorithm == "bcrypt":
        rounds = max(4, min(cost_factor, 15))
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds))
        digest = hashed.decode("utf-8")
    elif algorithm == "pbkdf2":
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt_bytes,
            max(1000, iterations),
        )
        digest = base64.urlsafe_b64encode(derived).decode("utf-8")
    elif algorithm == "sha256":
        digest = hashlib.sha256(password.encode("utf-8") + salt_bytes).hexdigest()
    else:
        # Educational Argon2 stand-in using scrypt when argon2 bindings are unavailable.
        derived = hashlib.scrypt(
            password=password.encode("utf-8"),
            salt=salt_bytes,
            n=2 ** min(max(cost_factor, 12), 15),
            r=max(1, parallelism),
            p=max(1, min(parallelism, 8)),
            dklen=32,
        )
        digest = f"argon2-demo${base64.urlsafe_b64encode(derived).decode('utf-8')}"

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    return digest, elapsed_ms


def _estimate_attack_results(
    entropy: float, algorithm: str, elapsed_ms: float
) -> tuple[str, list[dict[str, str | int | float]]]:
    speed_penalty = {
        "sha256": 1.0,
        "pbkdf2": 8_000,
        "bcrypt": 60_000,
        "argon2": 180_000,
    }[algorithm]
    attempts_per_second = max(1.0, 5_000_000_000 / speed_penalty)
    crack_seconds = (2 ** min(entropy, 80)) / attempts_per_second
    crack_time_estimate = _format_duration(crack_seconds)

    attack_rows = [
        {
            "attack": "Dictionary attack",
            "attempts_per_second": round(attempts_per_second * 0.08),
            "estimated_time": _format_duration(crack_seconds * 0.04),
            "success_probability": "High" if entropy < 40 else "Medium" if entropy < 60 else "Low",
        },
        {
            "attack": "Brute force attack",
            "attempts_per_second": round(attempts_per_second),
            "estimated_time": crack_time_estimate,
            "success_probability": "Medium" if entropy < 55 else "Low",
        },
        {
            "attack": "Rainbow table attack",
            "attempts_per_second": round(attempts_per_second * 2.5),
            "estimated_time": "Ineffective with unique salts",
            "success_probability": "Low" if algorithm != "sha256" else "Medium",
        },
        {
            "attack": "GPU cracking simulation",
            "attempts_per_second": round(attempts_per_second * (5 if algorithm == "sha256" else 1.3)),
            "estimated_time": _format_duration(max(crack_seconds / 3, 1)),
            "success_probability": "High" if algorithm == "sha256" and entropy < 65 else "Low",
        },
    ]

    return crack_time_estimate, attack_rows


@analysis_blueprint.post("/analyze-password")
def analyze_password():
    payload = request.get_json(silent=True) or {}
    errors = _validate_payload(payload)

    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    password = payload["password"]
    algorithm = payload.get("algorithm", "bcrypt").lower()
    salt_length = int(payload.get("salt_length", 16))
    cost_factor = int(payload.get("cost_factor", 12))
    memory_cost = int(payload.get("memory_cost", 65536))
    parallelism = int(payload.get("parallelism", 2))
    iterations = int(payload.get("iterations", 120000))

    salt, salt_bytes = _generate_salt(salt_length)
    digest, elapsed_ms = _hash_password(
        password=password,
        algorithm=algorithm,
        salt_bytes=salt_bytes,
        cost_factor=cost_factor,
        iterations=iterations,
        memory_cost=memory_cost,
        parallelism=parallelism,
    )
    entropy = _estimate_entropy(password)
    crack_time_estimate, attack_rows = _estimate_attack_results(
        entropy, algorithm, elapsed_ms
    )

    profile = ALGORITHM_PROFILES[algorithm]
    response = {
        "success": True,
        "salt": salt,
        "hash": digest,
        "entropy": entropy,
        "security_metrics": {
            "length": len(password),
            "character_diversity": _estimate_charset(password),
            "hash_time_ms": elapsed_ms,
            "memory_cost": memory_cost,
            "parallelism": parallelism,
            "iterations": iterations,
        },
        "crack_time_estimate": crack_time_estimate,
        "attack_simulation_results": attack_rows,
        "algorithm_comparison": [
            {
                "algorithm": name,
                "hash_speed": info.hash_speed_label,
                "memory_usage": info.memory_usage,
                "security_level": info.security_level,
            }
            for name, info in ALGORITHM_PROFILES.items()
        ],
        "pipeline": [
            {"stage": "Password Input", "value": "User supplied secret"},
            {"stage": "Salt Generation", "value": salt},
            {"stage": "Hash Algorithm", "value": algorithm.upper()},
            {"stage": "Hash Output", "value": digest[:32] + ("..." if len(digest) > 32 else "")},
            {"stage": "Database Storage", "value": "Salt + hash would be stored together"},
        ],
        "algorithm_notes": {
            "algorithm": algorithm,
            "hash_speed": profile.hash_speed_label,
            "memory_usage": profile.memory_usage,
            "security_level": profile.security_level,
            "attacks_resisted": profile.attacks_resisted,
            "mode": "educational-demo" if algorithm == "argon2" else "direct",
        },
    }
    return jsonify(response), 200

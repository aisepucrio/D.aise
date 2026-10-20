"""
Hash de senha (PBKDF2-HMAC-SHA256, biblioteca padrão — sem dependência extra).

Formato guardado: pbkdf2_sha256$<iterações>$<salt_hex>$<hash_hex>
"""
import hashlib
import hmac
import os

_ALGO = "pbkdf2_sha256"
_ITERATIONS = 200_000
_SALT_BYTES = 16


def hash_password(password: str, iterations: int = _ITERATIONS) -> str:
    if not password:
        raise ValueError("Senha vazia.")
    salt = os.urandom(_SALT_BYTES)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"{_ALGO}${iterations}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if not password or not stored:
        return False
    try:
        algo, iters, salt_hex, hash_hex = stored.split("$", 3)
    except ValueError:
        return False
    if algo != _ALGO:
        return False
    try:
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iters)
        )
    except (ValueError, TypeError):
        return False
    # Comparação em tempo constante.
    return hmac.compare_digest(dk.hex(), hash_hex)

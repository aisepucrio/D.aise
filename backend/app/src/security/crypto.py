"""
Criptografia de credenciais em repouso.

Segredos guardados no modo 'cloud' (Postgres) são cifrados com Fernet
(AES-128-CBC + HMAC autenticado). A chave-mestra vem da variável de ambiente
`DAISE_SECRET_KEY` e NUNCA é guardada no banco.

Formato do texto cifrado: `enc:v1:<fernet_token>` — o prefixo permite
distinguir valores cifrados de valores em texto puro e habilitar rotação futura.
"""
import os

from cryptography.fernet import Fernet, InvalidToken

_PREFIX = "enc:v1:"


class SecretKeyMissingError(RuntimeError):
    """Levantada quando uma operação cloud precisa da chave mas ela não existe."""


def generate_key() -> str:
    """Gera uma chave Fernet nova (use para popular DAISE_SECRET_KEY)."""
    return Fernet.generate_key().decode("utf-8")


def is_configured() -> bool:
    return bool(os.getenv("DAISE_SECRET_KEY"))


def _fernet() -> Fernet:
    key = os.getenv("DAISE_SECRET_KEY")
    if not key:
        raise SecretKeyMissingError(
            "DAISE_SECRET_KEY não definida. Ela é obrigatória para armazenar "
            "credenciais no modo 'cloud' (criptografado). Gere uma com "
            "`python -m app.src.security.crypto` e defina no ambiente."
        )
    try:
        return Fernet(key.encode("utf-8"))
    except (ValueError, TypeError) as exc:
        raise SecretKeyMissingError(
            "DAISE_SECRET_KEY inválida: deve ser uma chave Fernet "
            "(32 bytes url-safe base64)."
        ) from exc


def is_encrypted(value: str) -> bool:
    return isinstance(value, str) and value.startswith(_PREFIX)


def encrypt(plaintext: str) -> str:
    """Cifra um segredo. String vazia continua vazia (nada a proteger)."""
    if not plaintext:
        return ""
    if is_encrypted(plaintext):
        return plaintext  # já cifrado; evita cifrar duas vezes
    token = _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")
    return _PREFIX + token


def decrypt(value: str) -> str:
    """Decifra um valor `enc:v1:...`. Valor vazio ou em texto puro passa direto."""
    if not value:
        return ""
    if not is_encrypted(value):
        return value  # tolera dados legados em texto puro
    token = value[len(_PREFIX):].encode("utf-8")
    try:
        return _fernet().decrypt(token).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError(
            "Falha ao decifrar credencial: chave incorreta ou dado corrompido."
        ) from exc


def mask(secret: str) -> str:
    """Máscara para exibição na API/UI: mostra só os últimos dígitos."""
    if not secret:
        return ""
    tail = secret[-4:] if len(secret) >= 4 else secret
    return "••••" + tail


if __name__ == "__main__":  # pragma: no cover
    # Conveniência de linha de comando: gerar uma chave-mestra.
    print(generate_key())

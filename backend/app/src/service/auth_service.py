"""
Autenticação: registro, login (sessão revogável) e resolução de usuário por token.

O token é opaco e aleatório; guardamos apenas o seu HASH (sha256) em
auth_sessions.token_hash. O cliente envia `Authorization: Bearer <token>`.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.src.db import session_scope
from app.src.db_models import AuthSession, User, UserSettings
from app.src.security import passwords

SESSION_TTL_DAYS = 30


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def register(email: str, password: str, name: str = "") -> dict:
    email = (email or "").strip().lower()
    if not email or not password:
        raise ValueError("E-mail e senha são obrigatórios.")
    if len(password) < 6:
        raise ValueError("A senha deve ter ao menos 6 caracteres.")
    with session_scope() as s:
        if s.query(User).filter(User.email == email).first():
            raise ValueError("E-mail já cadastrado.")
        u = User(
            email=email,
            name=(name or "").strip(),
            role="member",
            password_hash=passwords.hash_password(password),
        )
        u.settings = UserSettings()
        s.add(u)
        s.flush()
        return u.to_dict()


def login(email: str, password: str, user_agent: str = "", ip: str = "") -> dict | None:
    """Retorna {token, user, expires_at} ou None se credenciais inválidas."""
    email = (email or "").strip().lower()
    with session_scope() as s:
        u = s.query(User).filter(User.email == email).one_or_none()
        if u is None or not u.is_active or not passwords.verify_password(password, u.password_hash):
            return None
        token = secrets.token_urlsafe(32)
        expires = _now() + timedelta(days=SESSION_TTL_DAYS)
        s.add(AuthSession(
            user_id=u.id,
            token_hash=_hash_token(token),
            user_agent=(user_agent or "")[:400],
            ip=ip or "",
            expires_at=expires,
        ))
        user = u.to_dict()
    return {
        "token": token,
        "user": user,
        "expires_at": expires.isoformat().replace("+00:00", "Z"),
    }


def logout(token: str) -> bool:
    """Revoga a sessão do token. Retorna True se revogou algo."""
    if not token:
        return False
    with session_scope() as s:
        sess = (
            s.query(AuthSession)
            .filter(AuthSession.token_hash == _hash_token(token))
            .one_or_none()
        )
        if sess is None or sess.revoked_at is not None:
            return False
        sess.revoked_at = _now()
        return True


def resolve_user_id_from_token(token: str) -> str | None:
    """Valida o token (existe, não revogado, não expirado) e retorna o user_id."""
    if not token:
        return None
    with session_scope() as s:
        sess = (
            s.query(AuthSession)
            .filter(AuthSession.token_hash == _hash_token(token))
            .one_or_none()
        )
        if sess is None or sess.revoked_at is not None:
            return None
        exp = sess.expires_at
        if exp is not None:
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < _now():
                return None
        return sess.user_id


def get_user(user_id: str) -> dict | None:
    with session_scope() as s:
        u = s.get(User, user_id)
        return u.to_dict() if u else None


def update_profile(user_id: str, email: str | None = None, name: str | None = None) -> dict:
    """Atualiza e-mail e/ou nome do usuário. Levanta ValueError em caso inválido."""
    with session_scope() as s:
        u = s.get(User, user_id)
        if u is None:
            raise ValueError("Usuário não encontrado.")
        if email is not None:
            email = email.strip().lower()
            if not email or "@" not in email:
                raise ValueError("E-mail inválido.")
            taken = (
                s.query(User)
                .filter(User.email == email, User.id != user_id)
                .first()
            )
            if taken:
                raise ValueError("E-mail já em uso.")
            u.email = email
        if name is not None:
            u.name = name.strip()
        s.flush()
        return u.to_dict()


def change_password(user_id: str, current_password: str, new_password: str) -> bool:
    """Troca a senha após validar a atual. Levanta ValueError se inválido."""
    if not new_password or len(new_password) < 6:
        raise ValueError("A nova senha deve ter ao menos 6 caracteres.")
    with session_scope() as s:
        u = s.get(User, user_id)
        if u is None:
            raise ValueError("Usuário não encontrado.")
        if not passwords.verify_password(current_password, u.password_hash):
            raise ValueError("Senha atual incorreta.")
        u.password_hash = passwords.hash_password(new_password)
        return True

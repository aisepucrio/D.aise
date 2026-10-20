"""
Camada de acesso ao banco (PostgreSQL via SQLAlchemy).

A engine é criada de forma preguiçosa (lazy) na primeira vez que uma sessão é
pedida, para que importar este módulo não exija DATABASE_URL — útil para
ferramentas, testes e para o app subir mesmo antes de configurar o banco.
"""
import os
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DEFAULT_DATABASE_URL = "postgresql+psycopg://daise:daise@localhost:5432/daise"


class Base(DeclarativeBase):
    pass


def _normalize_url(url: str) -> str:
    """Garante o driver psycopg3. Aceita a forma curta `postgresql://`."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgres://"):  # forma usada por alguns provedores
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


def get_database_url() -> str:
    return _normalize_url(os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))


_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(get_database_url(), pool_pre_ping=True, future=True)
    return _engine


def get_sessionmaker():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autoflush=False, future=True)
    return _SessionLocal


@contextmanager
def session_scope():
    """Fornece uma sessão transacional. Faz commit no sucesso, rollback no erro."""
    session = get_sessionmaker()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """Cria as tabelas se ainda não existirem (idempotente).

    Em produção prefira as migrações do Alembic; este helper é conveniente para
    desenvolvimento e para o primeiro boot.
    """
    # Importa os models para registrá-los no metadata antes do create_all.
    from app.src import db_models  # noqa: F401

    Base.metadata.create_all(bind=get_engine())

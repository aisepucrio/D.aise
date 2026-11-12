"""
Provisionamento do banco no boot do backend.

`bootstrap_database()` deixa o banco pronto para uso sem nenhum comando manual:

  1. Garante que o banco (e o usuário) da DATABASE_URL existem — cria se faltar.
  2. Aplica as migrações do Alembic (`alembic upgrade head`).
  3. No primeiro boot (banco sem prompts), roda o seed.

Tudo é idempotente: com o banco já pronto, cada passo é um no-op.

Para criar o que falta é preciso uma conexão com permissão para isso:

  - DATABASE_ADMIN_URL (opcional): conexão de um superusuário, ex.
    `postgresql://postgres:<senha>@localhost:5432/postgres`. Usada SÓ para
    criar o usuário/banco da DATABASE_URL quando eles não existem.
  - Sem ela, tenta com as próprias credenciais da DATABASE_URL (funciona
    quando o usuário já existe e pode criar bancos — ex. o `postgres`).
"""
import os

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import SQLAlchemyError

from app.src.db import _normalize_url, get_database_url

_BACKEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)


class DatabaseBootstrapError(RuntimeError):
    """O banco não existe/não conecta e não foi possível provisioná-lo."""


def _can_connect(url: URL) -> Exception | None:
    """Tenta abrir uma conexão. Retorna None no sucesso, ou o erro."""
    engine = create_engine(url, future=True)
    try:
        with engine.connect():
            return None
    except SQLAlchemyError as e:
        return e
    finally:
        engine.dispose()


def _admin_url(target: URL) -> URL:
    """Conexão usada para criar o que falta (ver docstring do módulo)."""
    admin = os.getenv("DATABASE_ADMIN_URL", "").strip()
    if admin:
        return make_url(_normalize_url(admin))
    # Mesmo servidor/credenciais da app, no banco de manutenção `postgres`.
    return target.set(database="postgres")


def ensure_database() -> bool:
    """Cria o usuário e o banco da DATABASE_URL se ainda não existirem.

    Retorna True se criou algo, False se já estava tudo lá.
    """
    import psycopg
    from psycopg import sql

    target = make_url(get_database_url())
    first_error = _can_connect(target)
    if first_error is None:
        return False

    admin = _admin_url(target)
    engine = create_engine(admin, isolation_level="AUTOCOMMIT", future=True)
    created = []
    try:
        with engine.connect() as conn:
            # Comandos utilitários (CREATE ROLE/DATABASE) não aceitam bind
            # parameters: compomos com psycopg.sql, que faz o quoting seguro.
            raw = conn.connection.driver_connection

            role, dbname = target.username, target.database
            if role and role != admin.username:
                exists = conn.execute(
                    text("SELECT 1 FROM pg_roles WHERE rolname = :r"), {"r": role}
                ).first()
                if not exists:
                    stmt = sql.SQL("CREATE ROLE {} LOGIN").format(sql.Identifier(role))
                    if target.password:
                        stmt += sql.SQL(" PASSWORD {}").format(
                            sql.Literal(target.password)
                        )
                    raw.execute(stmt)
                    created.append(f"usuário '{role}'")

            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :d"), {"d": dbname}
            ).first()
            if not exists:
                stmt = sql.SQL("CREATE DATABASE {}").format(sql.Identifier(dbname))
                if role:
                    stmt += sql.SQL(" OWNER {}").format(sql.Identifier(role))
                raw.execute(stmt)
                created.append(f"banco '{dbname}'")
    except (SQLAlchemyError, psycopg.Error) as e:
        raise DatabaseBootstrapError(_help_message(target, admin, first_error, e)) from e
    finally:
        engine.dispose()

    # Usuário e banco existem; se ainda assim não conecta, o problema é outro
    # (ex.: senha da DATABASE_URL diferente da do usuário já existente).
    retry_error = _can_connect(target)
    if retry_error is not None:
        raise DatabaseBootstrapError(_help_message(target, admin, retry_error, None))

    if created:
        print(f"✅ Criado no Postgres: {', '.join(created)}.")
    return bool(created)


def _help_message(target: URL, admin: URL, app_error, admin_error) -> str:
    """Mensagem de erro dizendo o que configurar (sem expor senhas)."""
    shown = target.render_as_string(hide_password=True)
    lines = [f"não foi possível conectar em {shown}", f"  erro: {_short(app_error)}"]
    if admin_error is not None:
        shown_admin = admin.render_as_string(hide_password=True)
        lines.append(f"e não foi possível criar o banco usando {shown_admin}")
        lines.append(f"  erro: {_short(admin_error)}")
    if not os.getenv("DATABASE_ADMIN_URL", "").strip():
        lines.append(
            "Para o backend criar o usuário/banco sozinho, defina no backend/.env "
            "a conexão de um superusuário do seu Postgres:\n"
            "  DATABASE_ADMIN_URL=postgresql://postgres:<senha>@"
            f"{target.host or 'localhost'}:{target.port or 5432}/postgres"
        )
    return "\n".join(lines)


def _short(error) -> str:
    """Primeira linha do erro do driver (sem o rodapé do SQLAlchemy)."""
    cause = getattr(error, "orig", None) or error
    text_ = str(cause).strip()
    return text_.splitlines()[0] if text_ else type(cause).__name__


def run_migrations() -> None:
    """Equivalente a `alembic upgrade head`, independente do diretório atual."""
    from alembic import command
    from alembic.config import Config

    cfg = Config(os.path.join(_BACKEND_DIR, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(_BACKEND_DIR, "migrations"))
    # Não deixa o Alembic reconfigurar o logging do processo (ver migrations/env.py).
    cfg.attributes["configure_logger"] = False
    command.upgrade(cfg, "head")


def seed_if_empty() -> bool:
    """Roda o seed no primeiro boot (banco ainda sem prompts).

    Não roda de novo depois, para não sobrescrever prompts editados na UI a
    cada reinício do servidor. Para forçar: `python -m scripts.migrate_json_to_pg`.
    """
    from app.src.db import session_scope
    from app.src.db_models import Prompt

    with session_scope() as s:
        if s.query(Prompt.id).first() is not None:
            return False

    from scripts.migrate_json_to_pg import main as seed_main

    seed_main()
    return True


def bootstrap_database() -> None:
    """Deixa o banco pronto: cria se faltar, migra e faz o seed inicial."""
    ensure_database()
    run_migrations()
    seed_if_empty()
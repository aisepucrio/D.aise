"""Ambiente de migração do Alembic.

Usa a mesma resolução de URL e metadata do app (app.src.db), então as
migrações batem exatamente com os models declarados em app.src.db_models.
"""
from logging.config import fileConfig

from alembic import context

from app.src.db import Base, get_database_url
import app.src.db_models  # noqa: F401  (registra os models no metadata)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Injeta a URL vinda do ambiente (DATABASE_URL) em vez do alembic.ini.
config.set_main_option("sqlalchemy.url", get_database_url())

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    from sqlalchemy import engine_from_config, pool

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_database_url()
    connectable = engine_from_config(
        configuration, prefix="sqlalchemy.", poolclass=pool.NullPool
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

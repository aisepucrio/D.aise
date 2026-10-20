"""schema inicial (modelo multiusuário) a partir dos models

Baseline: cria todas as tabelas diretamente do metadata dos models
(app.src.db_models), garantindo que a migração bate exatamente com o ORM —
incluindo constraints e o índice único parcial one_default_per_type.

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-23
"""
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    from app.src.db import Base
    import app.src.db_models  # noqa: F401  (registra os models no metadata)

    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    from app.src.db import Base
    import app.src.db_models  # noqa: F401

    Base.metadata.drop_all(bind=op.get_bind())

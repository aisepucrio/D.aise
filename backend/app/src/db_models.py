"""
Models ORM (SQLAlchemy 2.0) do D.aise.

Modelo alvo da refatoração (multiusuário, com login, credenciais por usuário e
histórico completo de execuções da LLM). Tabelas:

    users            contas de login
    auth_sessions    sessões de login (revogáveis)
    credentials      tokens de provedor por usuário (cifrados)
    user_settings    preferências de LLM por usuário (1:1)
    projects         projetos/repositórios (por usuário)
    prompts          biblioteca de prompts (global) + is_default
    generations      histórico de execuções da LLM
    review_decisions aprovações/reprovações de cada geração

Estes models são separados das classes de domínio (model/*.py), que delegam a
persistência para cá.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.src.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _iso(dt: datetime | None) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


# Colunas de timestamp reutilizadas em várias tabelas.
def _created():
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def _updated():
    return mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# ─────────────────────────────────────────────────────────────────────────────
# users
# ─────────────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="member")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    settings: Mapped["UserSettings"] = relationship(
        back_populates="user", uselist=False,
        cascade="all, delete-orphan", passive_deletes=True,
    )
    sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True,
    )
    credentials: Mapped[list["Credential"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True,
    )
    projects: Mapped[list["Project"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True,
    )

    def to_dict(self) -> dict:
        # Nunca serializa o hash da senha.
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": _iso(self.created_at),
            "updated_at": _iso(self.updated_at),
        }


# ─────────────────────────────────────────────────────────────────────────────
# auth_sessions
# ─────────────────────────────────────────────────────────────────────────────
class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(Text)
    ip: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()

    user: Mapped["User"] = relationship(back_populates="sessions")

    __table_args__ = (Index("idx_sessions_user", "user_id"),)


# ─────────────────────────────────────────────────────────────────────────────
# credentials
# ─────────────────────────────────────────────────────────────────────────────
class Credential(Base):
    __tablename__ = "credentials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)  # gemini|openai|ollama|github
    secret_ciphertext: Mapped[str] = mapped_column(Text, nullable=False, default="")
    storage_mode: Mapped[str] = mapped_column(String, nullable=False, default="cloud")
    masked_hint: Mapped[str] = mapped_column(Text, nullable=False, default="")
    meta: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    user: Mapped["User"] = relationship(back_populates="credentials")

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_credentials_user_provider"),
    )

    def to_dict(self) -> dict:
        # Nunca serializa o segredo cifrado.
        return {
            "id": self.id,
            "provider": self.provider,
            "hasKey": bool(self.secret_ciphertext) or self.storage_mode == "local",
            "maskedKey": self.masked_hint,
            "storageMode": self.storage_mode,
            "meta": self.meta or {},
        }


# ─────────────────────────────────────────────────────────────────────────────
# user_settings (1:1 com users)
# ─────────────────────────────────────────────────────────────────────────────
class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    provider: Mapped[str] = mapped_column(String, nullable=False, default="gemini")
    model: Mapped[str] = mapped_column(Text, nullable=False, default="")
    temperature: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=0.7)
    max_output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = _updated()

    user: Mapped["User"] = relationship(back_populates="settings")

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "model": self.model,
            "temperature": float(self.temperature) if self.temperature is not None else None,
            "max_output_tokens": self.max_output_tokens,
        }


# ─────────────────────────────────────────────────────────────────────────────
# projects
# ─────────────────────────────────────────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    folder_name: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    path: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source: Mapped[str] = mapped_column(String, nullable=False, default="local")
    github_repo: Mapped[str] = mapped_column(Text, nullable=False, default="")
    language: Mapped[str] = mapped_column(Text, nullable=False, default="")
    framework: Mapped[str] = mapped_column(Text, nullable=False, default="")
    main_file: Mapped[str] = mapped_column(Text, nullable=False, default="")
    dependence_file_name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    readme: Mapped[str] = mapped_column(Text, nullable=False, default="")
    changelog: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tree: Mapped[str] = mapped_column(Text, nullable=False, default="")
    diff: Mapped[str] = mapped_column(Text, nullable=False, default="")
    commits: Mapped[str] = mapped_column(Text, nullable=False, default="")
    extra: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    user: Mapped["User"] = relationship(back_populates="projects")
    generations: Mapped[list["Generation"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "folder_name", name="uq_projects_user_folder"),
    )

    # Colunas persistidas (dependence_file_content/readme_content são lidas do disco).
    COLUMNS = (
        "id", "user_id", "folder_name", "name", "path", "source", "github_repo",
        "language", "framework", "main_file", "dependence_file_name",
        "description", "readme", "changelog", "tree", "diff", "commits",
    )

    def to_dict(self) -> dict:
        data = {c: getattr(self, c) for c in self.COLUMNS}
        if self.extra:
            data.update(self.extra)
        return data


# ─────────────────────────────────────────────────────────────────────────────
# prompts (biblioteca global) + is_default
# ─────────────────────────────────────────────────────────────────────────────
class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # mantém IDs hex atuais
    type: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    generations: Mapped[list["Generation"]] = relationship(back_populates="prompt")

    __table_args__ = (
        # No máximo 1 default por tipo (índice único parcial — Postgres).
        Index(
            "one_default_per_type", "type",
            unique=True, postgresql_where=text("is_default"),
        ),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "name": self.name,
            "description": self.description,
            "content": self.content,
            "is_active": self.is_active,
            "is_default": self.is_default,
            "created_at": _iso(self.created_at),
            "updated_at": _iso(self.updated_at),
        }


# ─────────────────────────────────────────────────────────────────────────────
# generations — histórico de execuções da LLM
# ─────────────────────────────────────────────────────────────────────────────
class Generation(Base):
    __tablename__ = "generations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    prompt_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("prompts.id", ondelete="SET NULL")
    )
    operation: Mapped[str] = mapped_column(String, nullable=False)  # create|update|analyze
    provider: Mapped[str] = mapped_column(String, nullable=False, default="")
    model: Mapped[str] = mapped_column(Text, nullable=False, default="")
    temperature: Mapped[float | None] = mapped_column(Numeric(3, 2))
    max_output_tokens: Mapped[int | None] = mapped_column(Integer)
    inputs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    prompt_rendered: Mapped[str] = mapped_column(Text, nullable=False, default="")
    output: Mapped[str] = mapped_column(Text, nullable=False, default="")
    previous_readme: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, nullable=False, default="success")
    error_message: Mapped[str | None] = mapped_column(Text)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    # Campos opcionais de avaliação de qualidade (para os experimentos).
    rating: Mapped[int | None] = mapped_column(SmallInteger)          # 1..5
    quality_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created()

    project: Mapped["Project"] = relationship(back_populates="generations")
    prompt: Mapped["Prompt | None"] = relationship(back_populates="generations")
    user: Mapped["User | None"] = relationship()
    decisions: Mapped[list["ReviewDecision"]] = relationship(
        back_populates="generation", cascade="all, delete-orphan",
        passive_deletes=True, order_by="ReviewDecision.created_at",
    )

    __table_args__ = (
        Index("idx_generations_project", "project_id", "created_at"),
    )

    def to_dict(self, include_output: bool = True) -> dict:
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "project_id": self.project_id,
            "prompt_id": self.prompt_id,
            "operation": self.operation,
            "provider": self.provider,
            "model": self.model,
            "temperature": float(self.temperature) if self.temperature is not None else None,
            "max_output_tokens": self.max_output_tokens,
            "inputs": self.inputs or {},
            "status": self.status,
            "error_message": self.error_message,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "duration_ms": self.duration_ms,
            "rating": self.rating,
            "quality_note": self.quality_note,
            "created_at": _iso(self.created_at),
        }
        if include_output:
            data["prompt_rendered"] = self.prompt_rendered
            data["output"] = self.output
            data["previous_readme"] = self.previous_readme
        return data


# ─────────────────────────────────────────────────────────────────────────────
# review_decisions — aprovações/reprovações
# ─────────────────────────────────────────────────────────────────────────────
class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    generation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("generations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    decision: Mapped[str] = mapped_column(String, nullable=False)  # approved | rejected
    apply_target: Mapped[str | None] = mapped_column(String)       # local | git_commit | github
    commit_hash: Mapped[str | None] = mapped_column(Text)
    commit_url: Mapped[str | None] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created()

    generation: Mapped["Generation"] = relationship(back_populates="decisions")
    user: Mapped["User | None"] = relationship()

    __table_args__ = (
        Index("idx_decisions_generation", "generation_id"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "generation_id": self.generation_id,
            "user_id": self.user_id,
            "decision": self.decision,
            "apply_target": self.apply_target,
            "commit_hash": self.commit_hash,
            "commit_url": self.commit_url,
            "note": self.note,
            "created_at": _iso(self.created_at),
        }

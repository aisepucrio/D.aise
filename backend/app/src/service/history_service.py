"""
Histórico de execuções da LLM (generations) e de decisões humanas
(review_decisions: aprovado/reprovado).

Registrar histórico nunca deve derrubar o fluxo principal — as funções de
gravação engolem erros e apenas logam, retornando None em caso de falha.
"""
from app.src.db import session_scope
from app.src.db_models import Generation, Project as ProjectRow, ReviewDecision
from app.src.service.user_context import current_user_id


def _project_id(session, folder_name: str, uid: str) -> str | None:
    row = (
        session.query(ProjectRow)
        .filter(ProjectRow.user_id == uid, ProjectRow.folder_name == folder_name)
        .one_or_none()
    )
    return row.id if row else None


def record_generation(
    folder_name: str,
    operation: str,
    agent,
    output: str,
    inputs: dict | None = None,
    prompt_id: str | None = None,
    previous_readme: str | None = None,
    status: str = "success",
    error_message: str | None = None,
) -> str | None:
    """Grava uma execução da LLM. Retorna o id da geração (ou None se falhar)."""
    try:
        uid = current_user_id()
        with session_scope() as s:
            pid = _project_id(s, folder_name, uid)
            if pid is None:
                return None
            usage = getattr(agent, "last_usage", None) or {}
            g = Generation(
                user_id=uid,
                project_id=pid,
                prompt_id=prompt_id,
                operation=operation,
                provider=getattr(agent, "last_provider", None) or "",
                model=getattr(agent, "last_model", None) or "",
                temperature=getattr(agent, "last_temperature", None),
                max_output_tokens=getattr(agent, "last_max_tokens", None),
                inputs=inputs or {},
                prompt_rendered=getattr(getattr(agent, "prompt", None), "content", "") or "",
                output=output or "",
                previous_readme=previous_readme,
                status=status,
                error_message=error_message,
                input_tokens=usage.get("input"),
                output_tokens=usage.get("output"),
                duration_ms=getattr(agent, "last_duration_ms", None),
            )
            s.add(g)
            s.flush()
            return g.id
    except Exception as e:  # nunca derruba o fluxo principal
        print(f"[history] falha ao gravar generation: {e}")
        return None


def record_decision(
    folder_name: str,
    decision: str,               # 'approved' | 'rejected'
    generation_id: str | None = None,
    apply_target: str | None = None,
    commit_hash: str | None = None,
    commit_url: str | None = None,
    note: str | None = None,
) -> str | None:
    """Grava uma decisão (aprovado/reprovado). Liga à última geração se não informado."""
    try:
        uid = current_user_id()
        with session_scope() as s:
            pid = _project_id(s, folder_name, uid)
            if pid is None:
                return None
            if not generation_id:
                last = (
                    s.query(Generation)
                    .filter(Generation.project_id == pid)
                    .order_by(Generation.created_at.desc())
                    .first()
                )
                if last is None:
                    return None  # sem geração p/ vincular a decisão
                generation_id = last.id
            d = ReviewDecision(
                generation_id=generation_id,
                user_id=uid,
                decision=decision,
                apply_target=apply_target,
                commit_hash=commit_hash,
                commit_url=commit_url,
                note=note,
            )
            s.add(d)
            s.flush()
            return d.id
    except Exception as e:
        print(f"[history] falha ao gravar decision: {e}")
        return None


def list_history(folder_name: str, limit: int = 50) -> list[dict]:
    """Histórico do projeto: gerações (sem o texto pesado) + suas decisões."""
    uid = current_user_id()
    with session_scope() as s:
        pid = _project_id(s, folder_name, uid)
        if pid is None:
            return []
        gens = (
            s.query(Generation)
            .filter(Generation.project_id == pid)
            .order_by(Generation.created_at.desc())
            .limit(limit)
            .all()
        )
        out = []
        for g in gens:
            item = g.to_dict(include_output=False)
            item["decisions"] = [d.to_dict() for d in g.decisions]
            out.append(item)
        return out


def list_user_history(limit: int = 100) -> list[dict]:
    """Todas as gerações do usuário (entre todos os projetos), mais recentes primeiro."""
    uid = current_user_id()
    with session_scope() as s:
        projs = {
            p.id: p.folder_name
            for p in s.query(ProjectRow).filter(ProjectRow.user_id == uid).all()
        }
        if not projs:
            return []
        gens = (
            s.query(Generation)
            .filter(Generation.project_id.in_(list(projs.keys())))
            .order_by(Generation.created_at.desc())
            .limit(limit)
            .all()
        )
        out = []
        for g in gens:
            item = g.to_dict(include_output=False)
            item["project"] = projs.get(g.project_id)
            item["decisions"] = [d.to_dict() for d in g.decisions]
            out.append(item)
        return out


def get_user_generation(generation_id: str) -> dict | None:
    """Uma geração completa (prompt enviado + output + decisões), se pertencer ao usuário."""
    uid = current_user_id()
    with session_scope() as s:
        g = s.get(Generation, generation_id)
        if g is None:
            return None
        proj = s.get(ProjectRow, g.project_id)
        if proj is None or proj.user_id != uid:
            return None
        data = g.to_dict(include_output=True)
        data["project"] = proj.folder_name
        data["decisions"] = [d.to_dict() for d in g.decisions]
        return data


def get_generation(folder_name: str, generation_id: str) -> dict | None:
    """Uma geração completa (com prompt_rendered e output) + decisões."""
    uid = current_user_id()
    with session_scope() as s:
        pid = _project_id(s, folder_name, uid)
        if pid is None:
            return None
        g = s.get(Generation, generation_id)
        if g is None or g.project_id != pid:
            return None
        data = g.to_dict(include_output=True)
        data["decisions"] = [d.to_dict() for d in g.decisions]
        return data

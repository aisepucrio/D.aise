import json
import os
import uuid
from datetime import datetime
import re

from app.src.model.project_model import Project


class Prompt:
    def __init__(self):
        self.prompts_path  = os.path.join("prompts", "prompts.json")
        self.defaults_path = os.path.join("data", "config", "default_prompts.json")
        self.content: str = ""
        self.project: Project | None = None 
        # garante que a pasta exista
        os.makedirs(os.path.dirname(self.prompts_path), exist_ok=True)

    def _load_json(self, path):
        if not os.path.exists(path):
            return {}

        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def load_all(self):
        from app.src.db import session_scope
        from app.src.db_models import Prompt as PromptRow

        with session_scope() as s:
            rows = s.query(PromptRow).all()
            prompts = {r.id: r.to_dict() for r in rows}
            # defaults derivam da coluna is_default (1 por tipo).
            defaults = {r.type: r.id for r in rows if r.is_default}

        return {
            "prompts": prompts,
            "defaults": defaults
        }

    def get_default_prompt_id(self, prompt_type: str):
        """Retorna o id do prompt marcado como default (is_default) para o tipo, ou None."""
        from app.src.db import session_scope
        from app.src.db_models import Prompt as PromptRow

        with session_scope() as s:
            row = (
                s.query(PromptRow)
                .filter(PromptRow.type == prompt_type, PromptRow.is_default.is_(True))
                .first()
            )
            return row.id if row else None

    def get_prompt_by_id(self, prompt_id: str):
        """
        Carrega um prompt pelo ID, aplica placeholders
        e retorna a própria instância da model.
        """
        from app.src.db import session_scope
        from app.src.db_models import Prompt as PromptRow

        with session_scope() as s:
            row = s.get(PromptRow, prompt_id)
            template: str = row.content if row else ""

        if not template:
            return None

        # 2. Aplica placeholders
        filled_prompt = self.fill_placeholders(template, self.project)

        # 3. Seta no estado da model
        self.content = filled_prompt
        self.save_prompt_debug(filled_prompt)
        print("📝 Prompt final preenchido:")

        return self


    def create_prompt(self, data):
        if not data:
            return {
                "success": False,
                "error": "Invalid payload"
            }

        from app.src.db import session_scope
        from app.src.db_models import Prompt as PromptRow

        prompt_id = data.get("id")

        with session_scope() as s:
            # ===== CREATE =====
            if not prompt_id:
                prompt_id = uuid.uuid4().hex
                row = PromptRow(
                    id=prompt_id,
                    name=data.get("name") or "",
                    type=data.get("type") or "",
                    description=data.get("description", ""),
                    content=data.get("content") or "",
                    is_active=data.get("is_active", True),
                )
                s.add(row)
                s.flush()
                return {"success": True, "data": row.to_dict()}

            # ===== UPDATE =====
            row = s.get(PromptRow, prompt_id)
            if row is None:
                return {"success": False, "error": "Prompt not found"}

            row.name = data.get("name", row.name)
            row.type = data.get("type", row.type)
            row.description = data.get("description", row.description)
            row.content = data.get("content", row.content)
            row.is_active = data.get("is_active", row.is_active)
            s.flush()
            return {"success": True, "data": row.to_dict()}


    def set_default_prompt(self, prompt_id, prompt_type):
        from app.src.db import session_scope
        from app.src.db_models import Prompt as PromptRow

        with session_scope() as s:
            prompt = s.get(PromptRow, prompt_id)
            if not prompt:
                return {
                    "success": False,
                    "error": "Prompt not found"
                }

            if not prompt.is_active:
                return {
                    "success": False,
                    "error": "Cannot set an inactive prompt as default"
                }

            # Desmarca o default anterior do tipo e marca o novo (índice único
            # parcial garante no máximo 1 por tipo). Faz em duas etapas para não
            # violar a constraint no meio do flush.
            ptype = prompt.type  # captura antes da sessão fechar
            s.query(PromptRow).filter(
                PromptRow.type == ptype,
                PromptRow.is_default.is_(True),
                PromptRow.id != prompt_id,
            ).update({"is_default": False})
            s.flush()
            prompt.is_default = True

        return {
            "success": True,
            "data": {
                "type": ptype,
                "prompt_id": prompt_id
            }
        }

    def delete(self, prompt_id: str) -> bool:
        from app.src.db import session_scope
        from app.src.db_models import Prompt as PromptRow

        with session_scope() as s:
            row = s.get(PromptRow, prompt_id)
            if row is None:
                return False
            s.delete(row)
            return True
    
    def fill_placeholders(self, template: str, project) -> str:
        """
        Substitui placeholders {{campo}} por conteúdo formatado do projeto.
        Se vazio, retorna string vazia.
        Campos longos (como tree ou diff) são formatados em bloco separado.
        """
        def replacer(match):
            field = match.group(1)

            # --- REGRA NOVA ---
            # Se o campo solicitado for 'dependence_file_name',
            # substitui automaticamente por 'dependence_file_content'
            if field == "dependence_file_content":
                if not getattr(project, "dependence_file_name", ""):
                    return ""


            value = getattr(project, field, "")

            if not value:
                return ""

            formatted_value = str(value).strip()

            long_fields = {"tree", "diff", "commit", "dependence_file_content"}

            if field in long_fields:
                return f"- {field.replace('_', ' ').title()}:\n```\n{formatted_value}\n```"

            return f"- {field.replace('_', ' ').title()}:\n  {formatted_value}"

        return re.sub(r"\{\{(\w+)\}\}", replacer, template)


    def save_prompt_debug(self,content: str):
        """Salva o prompt em prompts/template_debug.txt se DEBUG=true no .env"""
        from dotenv import load_dotenv
        load_dotenv()  # carrega variáveis do .env

        debug = os.getenv("DEBUG", "false").lower() == "true"
        if not debug:
            return  # se não estiver em modo debug, não faz nada

        os.makedirs("prompts", exist_ok=True)
        file_path = os.path.join("prompts", "template_debug.txt")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"📝 Prompt debug salvo em: {file_path}")
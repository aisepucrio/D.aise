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
        prompts = self._load_json(self.prompts_path)
        defaults = self._load_json(self.defaults_path)

        return {
            "prompts": prompts,
            "defaults": defaults
        }

    def get_prompt_by_id(self, prompt_id: str):
        """
        Carrega um prompt pelo ID, aplica placeholders
        e retorna a própria instância da model.
        """
        prompts = self._load_json(self.prompts_path)

        prompt_data = prompts.get(prompt_id)
        if not prompt_data:
            return None

        # 1. Extrai somente a STRING do prompt
        template: str = prompt_data.get("content", "")
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

        prompts = self._load_json(self.prompts_path)

        now = datetime.utcnow().isoformat() + "Z"
        prompt_id = data.get("id")

        # ===== CREATE =====
        if not prompt_id:
            prompt_id = uuid.uuid4().hex

            new_prompt = {
                "id": prompt_id,
                "name": data.get("name"),
                "type": data.get("type"),
                "description": data.get("description", ""),
                "content": data.get("content"),
                "is_active": data.get("is_active", True),
                "created_at": now,
                "updated_at": now
            }

            prompts[prompt_id] = new_prompt

            with open(self.prompts_path, "w", encoding="utf-8") as f:
                json.dump(prompts, f, indent=2, ensure_ascii=False)

            return {
                "success": True,
                "data": new_prompt
            }

        # ===== UPDATE =====
        if prompt_id not in prompts:
            return {
                "success": False,
                "error": "Prompt not found"
            }

        existing = prompts[prompt_id]

        existing.update({
            "name": data.get("name", existing["name"]),
            "type": data.get("type", existing["type"]),
            "description": data.get("description", existing.get("description", "")),
            "content": data.get("content", existing["content"]),
            "is_active": data.get("is_active", existing["is_active"]),
            "updated_at": now
        })

        prompts[prompt_id] = existing

        with open(self.prompts_path, "w", encoding="utf-8") as f:
            json.dump(prompts, f, indent=2, ensure_ascii=False)

        return {
            "success": True,
            "data": existing
        }


    def set_default_prompt(self, prompt_id, prompt_type):
        # carrega prompts e defaults
        prompts_data = self._load_json(self.prompts_path)
        defaults = self._load_json(self.defaults_path)

        # valida prompt
        prompt = prompts_data.get(prompt_id)
        if not prompt:
            return {
                "success": False,
                "error": "Prompt not found"
            }

        if not prompt.get("is_active", True):
            return {
                "success": False,
                "error": "Cannot set an inactive prompt as default"
            }

        # seta default por tipo
        defaults[prompt_type] = prompt_id

        # escreve no arquivo
        os.makedirs(os.path.dirname(self.defaults_path), exist_ok=True)
        with open(self.defaults_path, "w", encoding="utf-8") as f:
            json.dump(defaults, f, indent=2, ensure_ascii=False)

        return {
            "success": True,
            "data": {
                "type": prompt_type,
                "prompt_id": prompt_id
            }
        }

    def delete(self, prompt_id: str) -> bool:
        if not os.path.exists(self.prompts_path):
            return False

        with open(self.prompts_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if prompt_id not in data:
            return False

        del data[prompt_id]

        with open(self.prompts_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

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
import os
import json
from flask import Blueprint, render_template, request, jsonify

config_models_bp = Blueprint("config_models", __name__)

# Raiz do backend (…/backend), independente do cwd ao rodar server.py
_BACKEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
# Versionado no Git: catálogo estático de modelos por provedor
MODELS_PATH = os.path.join(_BACKEND_DIR, "config", "models.json")
# Gerado localmente (gitignored): credenciais e preferências do usuário
LLM_CONFIG_PATH = os.path.join(_BACKEND_DIR, "data", "config", "llm_config.json")

# Estrutura padrão quando o arquivo ainda não existe
def _default_config():
    return {
        "__lastSavedConfig": {
            "provider": "gemini",
            "model": "",
            "temperature": 0,
            "tokens": "0"
        },
        "gemini": {
            "apiKey": "",
            "committedApiKey": ""
        },
        "openai": {
            "apiKey": "",
            "committedApiKey": ""
        },
        "ollama": {
            "endpoint": "",
            "committedEndpoint": ""
        },
        "github": {
            "token": "",
            "committedToken": ""
        }
    }


def _read_config() -> dict:
    try:
        if not os.path.exists(LLM_CONFIG_PATH):
            return _default_config()
        with open(LLM_CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Garante que todos os campos esperados existem
        default = _default_config()
        for key, val in default.items():
            if key not in data:
                data[key] = val
        return data
    except Exception as e:
        print(f"llm_config: falha ao ler {LLM_CONFIG_PATH}: {e}")
        return _default_config()


def _write_config(data: dict):
    os.makedirs(os.path.dirname(LLM_CONFIG_PATH), exist_ok=True)
    with open(LLM_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _default_models() -> dict:
    """Catálogo padrão quando config/models.json não puder ser lido."""
    return {
        "gemini": [
            {"value": "gemini-3.1-pro", "label": "Gemini 3.1 Pro"},
            {"value": "gemini-3.1-flash-lite", "label": "Gemini 3.1 Flash Lite"},
            {"value": "gemini-3-flash", "label": "Gemini 3 Flash"},
            {"value": "gemini-2.5-pro", "label": "Gemini 2.5 Pro"},
            {"value": "gemini-2.5-flash", "label": "Gemini 2.5 Flash"},
            {"value": "gemini-2.5-flash-lite", "label": "Gemini 2.5 Flash Lite"},
        ],
        "openai": [
            {"value": "gpt-5.4", "label": "GPT-5.4"},
            {"value": "gpt-5.4-mini", "label": "GPT-5.4 Mini"},
            {"value": "gpt-5.4-nano", "label": "GPT-5.4 Nano"},
            {"value": "o3", "label": "o3"},
            {"value": "o4-mini", "label": "o4 Mini"},
        ],
        "ollama": [
            {"value": "gemma4:31b", "label": "Gemma 4 (31B)"},
            {"value": "nemotron-cascade:30b", "label": "Nemotron Cascade 2 (30B)"},
            {"value": "nemotron-3-nano:30b", "label": "Nemotron 3 Nano (30B)"},
            {"value": "mistral-small3.1", "label": "Mistral Small 3.1"},
            {"value": "llava:7b", "label": "LLaVa (7B)"},
            {"value": "deepseek-coder-v2:16b", "label": "DeepSeek Coder V2 (16B)"},
            {"value": "qwen2.5-coder:32b", "label": "Qwen 2.5 Coder (32B)"},
            {"value": "qwen3-coder:30b", "label": "Qwen 3 Coder (30B)"},
            {"value": "mistral-nemo:12b", "label": "Mistral Nemo (12B)"},
            {"value": "llama3.2:3b", "label": "Llama 3.2 (3B)"},
            {"value": "llama3.1:8b", "label": "Llama 3.1 (8B)"},
            {"value": "gemma2:2b", "label": "Gemma 2 (2B)"},
            {"value": "codellama:7b", "label": "Code Llama (7B)"},
            {"value": "deepseek-r1:14b", "label": "DeepSeek R1 (14B)"},
            {"value": "starcoder2:15b", "label": "StarCoder2 (15B)"},
            {"value": "codegemma:7b", "label": "CodeGemma (7B)"},
            {"value": "codellama:13b", "label": "Code Llama (13B)"},
            {"value": "qwen2.5-coder:14b", "label": "Qwen 2.5 Coder (14B)"},
            {"value": "qwen2.5-coder:7b", "label": "Qwen 2.5 Coder (7B)"},
            {"value": "mistral", "label": "Mistral"},
        ],
    }


@config_models_bp.route("/api/models", methods=["GET"])
def get_models():
    """Retorna a lista de modelos disponíveis por provedor."""
    try:
        if not os.path.exists(MODELS_PATH):
            return jsonify(_default_models()), 200
        with open(MODELS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data), 200
    except Exception as e:
        print(f"models: falha ao ler {MODELS_PATH}: {e}")
        return jsonify({"error": str(e)}), 500


@config_models_bp.route("/")
def config_models_page():
    return render_template("config_models.html")


@config_models_bp.route("/api/llm-config", methods=["GET"])
def get_llm_config():
    """Retorna a config LLM SEM segredos (apenas hasKey/maskedKey/storageMode)."""
    from app.src.service import llm_config_service
    try:
        return jsonify(llm_config_service.get_config_for_api()), 200
    except Exception as e:
        print(f"llm_config: falha ao ler: {e}")
        return jsonify({"error": str(e)}), 500


@config_models_bp.route("/api/llm-config", methods=["POST"])
def save_llm_config():
    """
    Recebe e persiste a configuração LLM enviada pelo frontend.
    Aceita payload completo ou parcial — faz merge com o que já está salvo.
    Segredos em modo 'cloud' são cifrados; em modo 'local' vão para arquivo no host.
    """
    from app.src.service import llm_config_service
    from app.src.security.crypto import SecretKeyMissingError

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Payload inválido ou vazio."}), 400

    try:
        config = llm_config_service.save_config(payload)
    except SecretKeyMissingError as e:
        # Faltou a chave-mestra para cifrar um segredo do modo cloud.
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"llm_config: falha ao gravar: {e}")
        return jsonify({"error": f"Falha ao gravar configuração: {str(e)}"}), 500

    return jsonify({"message": "Configuração salva com sucesso.", "config": config}), 200

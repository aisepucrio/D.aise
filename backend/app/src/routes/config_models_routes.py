import os
import json
from flask import Blueprint, render_template, request, jsonify

config_models_bp = Blueprint("config_models", __name__)

LLM_CONFIG_PATH = os.path.join("data", "config", "llm_config.json")
MODELS_PATH = os.path.join("data", "config", "models.json")

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


@config_models_bp.route("/api/models", methods=["GET"])
def get_models():
    """Retorna a lista de modelos disponíveis por provedor."""
    try:
        if not os.path.exists(MODELS_PATH):
            return jsonify({"error": "Arquivo models.json não encontrado."}), 404
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
    """Retorna a configuração LLM salva (credenciais + última config salva)."""
    config = _read_config()
    return jsonify(config), 200


@config_models_bp.route("/api/llm-config", methods=["POST"])
def save_llm_config():
    """
    Recebe e persiste a configuração LLM enviada pelo frontend.
    Aceita payload completo ou parcial — faz merge com o que já está salvo.
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Payload inválido ou vazio."}), 400

    current = _read_config()

    # Merge: sobrescreve apenas as chaves enviadas
    for key in ["__lastSavedConfig", "gemini", "openai", "ollama", "github"]:
        if key in payload:
            if isinstance(payload[key], dict) and isinstance(current.get(key), dict):
                current[key].update(payload[key])
            else:
                current[key] = payload[key]

    try:
        _write_config(current)
    except Exception as e:
        print(f"llm_config: falha ao gravar: {e}")
        return jsonify({"error": f"Falha ao gravar configuração: {str(e)}"}), 500

    return jsonify({"message": "Configuração salva com sucesso.", "config": current}), 200

"""
Perfil e privacidade do usuário autenticado (Bearer token).

- PATCH /account/profile        atualiza nome/e-mail
- POST  /account/password       troca a senha
- GET   /account/history        histórico de gerações do usuário
- GET   /account/generations/<id>  detalhe de uma geração
- DELETE /account/credentials   apaga as chaves/tokens (sem rastro)
"""
from flask import Blueprint, jsonify, request

from app.src.service import auth_service, history_service, llm_config_service
from app.src.service.user_context import current_user_id

account_bp = Blueprint("account", __name__)


@account_bp.route("/profile", methods=["PATCH"])
def update_profile():
    data = request.get_json(silent=True) or {}
    try:
        user = auth_service.update_profile(
            current_user_id(),
            email=data.get("email"),
            name=data.get("name"),
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"user": user}), 200


@account_bp.route("/password", methods=["POST"])
def change_password():
    data = request.get_json(silent=True) or {}
    try:
        auth_service.change_password(
            current_user_id(),
            current_password=data.get("current_password", ""),
            new_password=data.get("new_password", ""),
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"message": "Senha alterada."}), 200


@account_bp.route("/history", methods=["GET"])
def history():
    return jsonify(history_service.list_user_history()), 200


@account_bp.route("/generations/<generation_id>", methods=["GET"])
def generation(generation_id):
    g = history_service.get_user_generation(generation_id)
    if g is None:
        return jsonify({"error": "Geração não encontrada."}), 404
    return jsonify(g), 200


@account_bp.route("/credentials", methods=["DELETE"])
def clear_credentials():
    """Apaga todas as credenciais (chaves/tokens) do usuário — banco e arquivo local."""
    removed = llm_config_service.clear_credentials()
    return jsonify({
        "message": "Credenciais removidas.",
        "removed": removed,
    }), 200

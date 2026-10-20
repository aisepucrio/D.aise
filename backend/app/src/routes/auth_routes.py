from flask import Blueprint, jsonify, request

from app.src.service import auth_service

auth_bp = Blueprint("auth", __name__)


def _bearer_token() -> str:
    auth = request.headers.get("Authorization", "")
    return auth[len("Bearer "):].strip() if auth.startswith("Bearer ") else ""


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    try:
        user = auth_service.register(
            email=data.get("email", ""),
            password=data.get("password", ""),
            name=data.get("name", ""),
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"user": user}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    result = auth_service.login(
        email=data.get("email", ""),
        password=data.get("password", ""),
        user_agent=request.headers.get("User-Agent", ""),
        ip=request.remote_addr or "",
    )
    if result is None:
        return jsonify({"error": "Credenciais inválidas."}), 401
    return jsonify(result), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    auth_service.logout(_bearer_token())
    return jsonify({"message": "Sessão encerrada."}), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    uid = auth_service.resolve_user_id_from_token(_bearer_token())
    if not uid:
        return jsonify({"error": "Não autenticado."}), 401
    user = auth_service.get_user(uid)
    if user is None:
        return jsonify({"error": "Usuário não encontrado."}), 404
    return jsonify({"user": user}), 200

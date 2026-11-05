"""
Guarda de autenticação para os blueprints de dados.

Exige um Bearer token válido; sem ele responde 401. Requisições OPTIONS
(preflight CORS) passam livres para o flask-cors responder.
"""
from flask import jsonify, request

from app.src.service.auth_service import resolve_user_id_from_token


def _token() -> str:
    auth = request.headers.get("Authorization", "")
    return auth[len("Bearer "):].strip() if auth.startswith("Bearer ") else ""


def require_login():
    if request.method == "OPTIONS":
        return None
    if not resolve_user_id_from_token(_token()):
        return jsonify({"error": "Autenticação necessária."}), 401
    return None

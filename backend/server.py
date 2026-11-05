from flask import Flask, render_template
from flask_cors import CORS
import os
from dotenv import load_dotenv
from app.src.routes.routes import register_routes

# Carrega variáveis do .env (USE_LLM, DEBUG, DATABASE_URL, DAISE_SECRET_KEY...)
load_dotenv()

# define o caminho dos templates dentro de src/view
base_dir = os.path.dirname(os.path.abspath(__file__))
template_dir = os.path.join(base_dir, "app", "src", "view")
static_dir = os.path.join(base_dir, "app", "src", "static")

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)


# registra TODAS as rotas
register_routes(app)
CORS(
    app,
    origins=["http://localhost:3000", "https://docsaise.aise-lab.com"],
    allow_headers=["Content-Type", "Authorization"],
)


def _startup_checks():
    """Inicializa o banco e valida a configuração de segurança."""
    try:
        from app.src.db import init_db
        init_db()
        print("✅ Banco inicializado (tabelas verificadas).")
        from app.src.service.user_context import ensure_bootstrap_user
        ensure_bootstrap_user()
        print("✅ Usuário bootstrap garantido.")
    except Exception as e:
        print(f"⚠️  Falha ao inicializar o banco: {e}")

    from app.src.security.crypto import is_configured
    if not is_configured():
        print(
            "⚠️  DAISE_SECRET_KEY não definida — necessária para guardar "
            "credenciais no modo 'cloud' (criptografado). Gere uma com "
            "`python -m app.src.security.crypto`."
        )


if __name__ == "__main__":
    _startup_checks()
    app.run(host="0.0.0.0", port=8765, debug=True)

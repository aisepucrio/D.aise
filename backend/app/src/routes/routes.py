from .main_routes import main_bp
from .project_routes import project_bp
from .prompt_routes import prompt_bp
from .config_models_routes import config_models_bp
from .auth_routes import auth_bp
from .account_routes import account_bp
from .guards import require_login

def register_routes(app):
    # Rotas de dados exigem login (Bearer token). /auth e / ficam públicas.
    # before_request precisa ser registrado ANTES de register_blueprint.
    project_bp.before_request(require_login)
    prompt_bp.before_request(require_login)
    config_models_bp.before_request(require_login)
    account_bp.before_request(require_login)

    app.register_blueprint(main_bp)
    app.register_blueprint(project_bp, url_prefix="/projects")
    app.register_blueprint(prompt_bp, url_prefix="/prompts")
    app.register_blueprint(config_models_bp, url_prefix="/models")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(account_bp, url_prefix="/account")

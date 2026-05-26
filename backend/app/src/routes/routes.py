from .main_routes import main_bp
from .project_routes import project_bp
from .prompt_routes import prompt_bp
from .config_models_routes import config_models_bp
# from .user_routes import user_bp

def register_routes(app):
    app.register_blueprint(main_bp)
    app.register_blueprint(project_bp, url_prefix="/projects")
    app.register_blueprint(prompt_bp, url_prefix="/prompts")
    app.register_blueprint(config_models_bp, url_prefix="/models")
    # app.register_blueprint(user_bp, url_prefix="/users")

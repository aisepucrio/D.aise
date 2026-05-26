from flask import Flask, render_template
from flask_cors import CORS
import os
from app.src.routes.routes import register_routes

# define o caminho dos templates dentro de src/view
base_dir = os.path.dirname(os.path.abspath(__file__))
template_dir = os.path.join(base_dir, "app", "src", "view")
static_dir = os.path.join(base_dir, "app", "src", "static")

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)


# registra TODAS as rotas
register_routes(app)
CORS(app, origins=["http://localhost:3000", "https://docsaise.aise-lab.com"])

if __name__ == "__main__":
    # mainTest()
    app.run(host="0.0.0.0", port=8765, debug=True)



from flask import Blueprint, render_template
# from app.src.control.select_folder_control import select_folder
import os 

main_bp = Blueprint("main", __name__)

@main_bp.route("/")
def home():
    USE_LLM = os.getenv("USE_LLM") in ["1", "true", "True", "TRUE"]
    return render_template("index.html", USE_LLM=USE_LLM)


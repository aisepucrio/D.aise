from flask import Blueprint, jsonify, request, render_template
from app.src.control.prompt_control import PromptControl

prompt_bp = Blueprint("prompts", __name__)

@prompt_bp.route("/")
def prompt_page():
    return render_template("prompts.html")


# ===== API =====

@prompt_bp.route("/get_all", methods=["GET"])
def get_prompts():
    control = PromptControl()
    result = control.list_prompts()

    status = result.get("status", 500)
    return jsonify(result), status


@prompt_bp.route("/<prompt_id>", methods=["GET"])
def get_prompt_by_id(prompt_id):
    control = PromptControl()
    prompt = control.get_prompt_by_id(prompt_id)
    return jsonify(prompt)


@prompt_bp.route("/create_prompt", methods=["POST"])
def save_prompt():
    data = request.get_json()
    control = PromptControl()
    created_prompt = control.create_prompt(data)
    return jsonify(created_prompt)

@prompt_bp.route("/set_default", methods=["POST"])
def set_default():
    data = request.get_json()
    control = PromptControl()
    response, status = control.set_default(data)
    return jsonify(response), status

@prompt_bp.route("/delete/<prompt_id>", methods=["DELETE"])
def delete_prompt(prompt_id):
    control = PromptControl()
    response, status = control.delete_prompt(prompt_id)
    return jsonify(response), status


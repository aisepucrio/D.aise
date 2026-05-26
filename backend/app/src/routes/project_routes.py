from flask import Blueprint, jsonify, request
# from app.src.control.project_control import select_path, choose_project_local, save_project_control 
from app.src.control.project_control import ProjectControl
import os

project_bp = Blueprint("projects", __name__)


# ================================= LISTAR TODOS OS PROJETOS =================================
@project_bp.route("/", methods=["GET"])
def get_projects():
    control = ProjectControl()
    projects = control.list_projects()  # pega todos os projetos
    return jsonify(projects)


# ================================= ESCOLHER REPOSITÓRIO LOCAL =================================
# @project_bp.route("/choose_project", methods=["GET"])
@project_bp.route("/choose_local_repository", methods=["GET"])
def choose_project():
    project_control = ProjectControl()
    response = project_control.choose_local_repository()
    return jsonify(response), response["status"] # chama via instância



# ========================================================================================================
# ===========================================  CRUD do projeto  ==========================================
# ========================================================================================================
@project_bp.route("/save_project", methods=["POST"])
def save_project():
    """ Salvar projeto """
    data = request.get_json()                   # JSON vindo da view
    control = ProjectControl()
    saved_project  = control.save_project(data)  # chama controller
    # return jsonify({
    #     "message": "Projeto salvo com sucesso!",
    #     "project": saved_project
    # })
    return saved_project


@project_bp.route("/<string:folder_name>/get_tree", methods=["GET"])
def get_tree(folder_name):
    control = ProjectControl()
    print("that foder name")
    print(folder_name)
    return control.get_tree_by_folder_name(folder_name)


@project_bp.route("/<string:folder_name>/refresh_tree", methods=["POST"])
def refresh_tree(folder_name):
    control = ProjectControl()
    return control.refresh_tree_by_folder_name(folder_name)


#  ROTA PARA EXCLUIR PROJETO
@project_bp.route("/<string:folder_name>", methods=["DELETE"])
def delete_project(folder_name):
    """Deleta o arquivo data/<folder_name>.json se existir"""
    print('\n\n\n FOLDER NAME:' )
    print(folder_name)
    control = ProjectControl()

    try:
        deleted = control.delete_project_control(folder_name)
        if deleted:
            return jsonify({"message": f"Projeto '{folder_name}' excluído com sucesso"}), 200
        else:
            return jsonify({"error": f"Projeto '{folder_name}' não encontrado"}), 404
    except Exception as e:
        print("Erro ao excluir projeto:", e)
        return jsonify({"error": "Erro interno ao excluir projeto"}), 500
    
@project_bp.route("/<string:folder_name>/analyze_with_llm", methods=["POST"])
def analyze_with_llm(folder_name):
    data = request.get_json(silent=True) or {}
    llm_config = data.get("llm_config") or {}
    control = ProjectControl()
    return control.analyze_with_llm(folder_name, llm_config=llm_config)

@project_bp.route("/<string:folder_name>/check_github_readme", methods=["POST"])
def check_github_readme(folder_name):
    data = request.get_json(silent=True) or {}
    github_token = data.get("github_token", "")
    control = ProjectControl()
    result, status = control.check_github_readme(folder_name, github_token)
    return jsonify(result), status
    
@project_bp.route("/open_folder", methods=["POST"])
def open_folder():
    print("aqui vai 2")
    data = request.get_json()
    path = data.get('path')
    print("path >>>")
    print(path)

    result, status_code = ProjectControl().open_folder(path)
    return jsonify(result), status_code


# generate_readme
@project_bp.route("/generate_readme", methods=["POST"])
def generate_readme():
    """Gera o conteúdo de um README com base nos dados do projeto"""
    data = request.get_json()
    control = ProjectControl()
    return control.generate_readme(data)

@project_bp.route("/update_readme", methods=["POST"])
def update_readme():
    """ Atualiza o README de um projeto existente """
    data = request.get_json()  # payload vindo do frontend

    control = ProjectControl()
    result, status = control.update_readme(data)

    return jsonify(result), status

@project_bp.route("/apply_readme", methods=["POST"])
def apply_readme():
    """Sobrescreve o README no projeto com o conteúdo escolhido."""
    data = request.get_json()  # pega folder_project, path, readme_text

    control = ProjectControl()
    result, status = control.apply_readme(data)

    return jsonify(result), status

@project_bp.route("/apply_readme_github", methods=["POST"])
def apply_readme_github():
    """Cria ou atualiza README.md diretamente no repositório GitHub via GitHub Contents API."""
    data = request.get_json()
    control = ProjectControl()
    result, status = control.apply_readme_github(data)
    return jsonify(result), status

@project_bp.route("/git_commit_readme", methods=["POST"])
def git_commit_readme():
    """Sobrescreve o README no projeto com o conteúdo escolhido."""
    data = request.get_json()  # pega folder_project, path, readme_text

    control = ProjectControl()
    result, status = control.git_commit(data)
    return jsonify(result), status

@project_bp.route("/undo_commit", methods=["POST"])
def undo_commit():
    control = ProjectControl()
    return control.undo_commit(request.get_json())   # retorna Response pronto


@project_bp.route("/import_github", methods=["POST"])
def import_github():
    data = request.get_json()
    url = data.get("url", "")
    token = data.get("github_token", "")
    control = ProjectControl()
    result, status = control.import_github_repository(url, token=token)
    return jsonify(result), status

# implementando essa parte
@project_bp.route("/clone_repository", methods=["POST"])
def clone_repository():
    data = request.get_json()
    url = data.get("url", "")
    token = data.get("github_token", "")
    control = ProjectControl()
    result, status = control.clone_repository(url, token=token)
    return jsonify(result), status

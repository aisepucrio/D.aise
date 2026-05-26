from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent
import os


def test4():
    path = r"C:\Users\arthu\Documents\GitHub\repository_documentation\repositories\mapa-frontend-next"
    language = "javascript"
    framework = "nextjs"
    dependence_file_name = "package.json"
    main_file = "src/pages/index.tsx"

    # Instanciar o Project com o path
    # project = Project(path=path, language="javascript", framework="nextjs", dependence_file="package.json", main_file="src/pages/index.tsx")
    project = Project(path=path, language=language, framework=framework, dependence_file_name=dependence_file_name, main_file=main_file)
    project.extract_info()

    # Exibir todos os campos formatados (graças ao __str__)
    print("\n\n================= Project Info ================= \n\n ")
    print(project)

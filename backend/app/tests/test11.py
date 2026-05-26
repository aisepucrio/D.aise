from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent
import os
import re


def test11():
    print("=== Iniciando geração de CHANGELOG ===")

    path = r"C:\Users\arthu\Documents\GitHub\repository_documentation\repositories\stnl-dataminer-web"
    language = "javascript"
    framework = "nextjs"
    dependence_file_name = "package.json"
    main_file = "src/app/page.tsx"
    description = (
        "STNL DataMiner Web is the frontend component of the STNL DataMiner project, "
        "designed to facilitate data mining from GitHub and Jira platforms. "
        "This web application serves as the user interface, enabling users to "
        "interact with and visualize data extracted from these sources."
    )

    print("[1] Criando objeto Project...")
    project = Project(
        path=path,
        language=language,
        framework=framework,
        dependence_file_name=dependence_file_name,
        main_file=main_file,
        description=description
    )

    # print("[2] Gerando prompt inicial de changelog...")
    prompt = Prompt(project=project)
    # template = prompt.initial_changelog()

    agent = Agent(project=project, prompt=prompt)

    all_commits = project.get_commits_by_range(include_diff=True, include_metadata=True)
    # print(all_commits)

    sumarized_diff = agent.summarize_text(all_commits)

    print("Commits resumidos:")
    print(sumarized_diff)
    base_dir = os.path.join("app", "output",  "summary")
    os.makedirs(base_dir, exist_ok=True)
    print(f"📁 Diretório de saída: {base_dir}")

    summary_path = os.path.join(base_dir, "diffs_sumarized.txt")

    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(sumarized_diff if sumarized_diff else "")

    print(f"✅ Arquivo criado com sucesso em: {summary_path}")

    # Determina o próximo número incremental
    
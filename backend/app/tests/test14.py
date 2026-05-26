from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent
import os
import re


def test14():
    """Test for generating a detailed project report using LLM agent.
    
        test writing the generated diff to a separate file
    """

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

    project = Project(
        path=path,
        language=language,
        framework=framework,
        dependence_file_name=dependence_file_name,
        main_file=main_file,
        description=description
    )
    prompt = Prompt(project=project)

    all_commits = project.get_commits_by_range(include_diff=True, include_metadata=True)

    # escrever os diffs em um arquivo separado
    diffs_path = os.path.join("app", "output", "diffs", "commits_diffs_filtered.txt")
    os.makedirs(os.path.dirname(diffs_path), exist_ok=True) 
    # escrever o conteudo inteiro do all_commits no arquivo all_diffs.txt
    with open(diffs_path, "w", encoding="utf-8") as f:  
                f.write(all_commits)


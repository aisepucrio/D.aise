from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent
import os
import re


def test9():

    print("teste 7")
    path = r"C:\Users\arthu\Documents\GitHub\repository_documentation\repositories\stnl-dataminer-web"

    language = "javascript"
    framework = "nextjs"
    dependence_file_name = "package.json"
    main_file = "src/app/page.tsx"
    description = "STNL DataMiner Web is the frontend component of the STNL DataMiner project, designed to facilitate data mining from GitHub and Jira platforms. This web application serves as the user interface, enabling users to interact with and visualize data extracted from these sources."

    # project = Project(path=path, language="javascript", framework="nextjs", dependence_file="package.json", main_file="src/pages/index.tsx")
    project = Project(path=path, language=language, framework=framework, dependence_file_name=dependence_file_name, main_file=main_file, description=description)

    # commits = project.get_commits_by_range(include_diff=True, include_metadata=False)
    commits = project.get_commits_by_range(include_diff=False, include_metadata=True)
    

    print("\n\n================= Commits Info ================= \n\n ")
    print(commits)


    print("\n\n================= Project Info ================= \n\n ")

from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent
import os
import re


def test15():
    """
    APARENTEMENTE ESSE TESTE CONSEGUIU PEGAR TODOS OS DIFFS SEM DAR ERRO ??
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
    agent = Agent(project=project, prompt=prompt)

    all_commits = project.get_commits_by_range(include_diff=True, include_metadata=True)

    template = prompt.initial_changelog(all_commits)

    response = agent.run(prompt=template)

    
    
    ## terminou
    
    
    print("[4] Verificando resposta do agente...")
    if not response:
        print("⚠️  Nenhum conteúdo retornado pela LLM. Encerrando.")
        return
    else:
        print("✅ Resposta recebida com sucesso.")

    print("[5] Preparando diretório de saída...")
    nameProject = project.name or os.path.basename(project.path)
    base_dir = os.path.join("app", "output", nameProject, "changelog")
    os.makedirs(base_dir, exist_ok=True)
    print(f"📁 Diretório de saída: {base_dir}")

    print("[6] Procurando changelogs existentes...")
    existing_files = [f for f in os.listdir(base_dir) if re.match(r'CHANGELOG(\d*)\.md', f)]
    print(f"🔍 Encontrados: {existing_files if existing_files else 'nenhum arquivo existente.'}")

    # Determina o próximo número incremental
    max_num = 0
    for f in existing_files:
        match = re.match(r'CHANGELOG(\d*)\.md', f)
        if match:
            num = match.group(1)
            if num:
                num = int(num)
                if num > max_num:
                    max_num = num

    new_num = max_num + 1
    changelog_name = f"CHANGELOG{new_num}.md"
    changelog_path = os.path.join(base_dir, changelog_name)

    print(f"[7] Gerando novo changelog: {changelog_name}")

    with open(changelog_path, "w", encoding="utf-8") as f:
        f.write(response)

    print(f"✅ Arquivo criado com sucesso em: {changelog_path}")

    print("\n================= Project Info =================\n")
    print(f"Nome do projeto: {project.name}")
    print(f"Linguagem: {project.language}")
    print(f"Framework: {project.framework}")
    print(f"Caminho do projeto: {project.path}")
    print("\n================================================\n")
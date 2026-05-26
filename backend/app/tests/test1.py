from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent
def test1():
    path = r"C:\Users\arthu\Documents\GitHub\repository_documentation\repositories\frontend_copy"
    print(path)
    project = Project("description of project", path )
    tree = project.tree

    agent = Agent(project)

    #create readme
    prompt = Prompt(project.name, project)
    # read dependencies // 
    dependenc_prompt = prompt.dependencies(tree)
    # print(dependenc_prompt)
    #read instalation
    file = agent.getConfigDependencies(dependenc_prompt)
    print("dependencies: ")
    print(file)
    packagejsonContent = project.getDependenciesContent(file)

    promptReadme = prompt.initial_readme(project.tree,packagejsonContent, "zs")

    agent.sugest_initial_Readmemd(promptReadme)
    #run llm




    #
    print('Test 1 running')
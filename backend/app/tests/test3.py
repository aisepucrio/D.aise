from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent


def test3():
    path = r"C:\Users\arthu\Documents\GitHub\repository_documentation\repositories\frontend_copy"
    project = Project("description of project", path )
    agent = Agent(project)

    agent.analyzeProjectLLM()
    #analize
    # create changelog by commit
    # get commits, description and title

    # get template

    pass
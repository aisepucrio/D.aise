from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent

def test2():
    print('Test 2 running')

    def altera_lista(lst):
        lst.append(100)  # modifica o objeto original

    def altera_inteiro(x):
        x = x + 1  # cria uma nova referência (não altera o original)

    # testando
    lista = [1, 2, 3]
    altera_lista(lista)
    print(lista)  # [1, 2, 3, 100]  ✅ foi alterada

    num = 10
    altera_inteiro(num)
    print(num)  # 10  🚫 não mudou
# Backend Flask (D.aise) — API em http://0.0.0.0:8765
FROM python:3.12-slim

# git: necessário pelo GitPython (clone/commit de repositórios).
# Não instalamos Tk: os imports de tkinter foram tornados tardios, então o
# servidor sobe sem GUI. O seletor nativo de pastas só funciona localmente.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# GitPython precisa saber a identidade para commits feitos pelo container.
ENV GIT_AUTHOR_NAME="D.aise" \
    GIT_AUTHOR_EMAIL="daise@localhost" \
    GIT_COMMITTER_NAME="D.aise" \
    GIT_COMMITTER_EMAIL="daise@localhost" \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8765

CMD ["python", "server.py"]

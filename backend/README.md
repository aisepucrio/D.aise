
# AISE Docs: A Python Web Application for Managing Projects and Prompts

## Introduction

AISE Docs is a Python web application designed to manage projects, users, and prompts in an MVC-like pattern using Flask. The application includes AI agent capabilities and integration with GitHub.

## Main File Structure

The main file structure of the project consists of:

* `README.md`: This file contains information about the project, including its purpose, dependencies, and usage instructions.
* `app/src/control`: This folder contains Python files that control the flow of data between the model and view layers.
* `app/src/model`: This folder contains Python files that define the structure and behavior of the application's models.
* `app/src/routes`: This folder contains Python files that define the application's routes and endpoints.
* `app/src/service`: This folder contains Python files that provide services to other parts of the application, such as user authentication and AI agent functionality.
* `app/src/static`: This folder contains static assets such as CSS and JavaScript files used by the application.
* `app/src/view`: This folder contains HTML templates and CSS stylesheets used by the application.
* `temporary/frontend_copy`: This folder contains a copy of the frontend code for testing purposes.
* `tests`: This folder contains test files that validate the behavior of the application's components.
* `main.py`: This file contains the main entry point of the application and is responsible for starting the Flask server.
* `prompts`: This folder contains mockup data used to test the application's prompt functionality.
* `requirements.txt`: This file lists the dependencies required by the application, including Flask and its dependencies.
* `server.py`: This file contains code that defines the behavior of the Flask server.
* `tree`: This folder contains a tree structure representation of the project's file hierarchy.

## Dependencies

The following main dependencies are required to run AISE Docs:

* Python 3.x
* Flask framework
* flask-cors
* python-dotenv
* google-genai
* GitPython
* tiktoken
* SQLAlchemy + Alembic (ORM and migrations)
* psycopg (PostgreSQL driver)
* cryptography (credential encryption at rest)

### Data store

State is persisted in **PostgreSQL** (not flat files). Four tables:
`projects`, `prompts`, `default_prompts`, and `llm_config`. The ORM models live
in `app/src/db_models.py`; the connection/session factory in `app/src/db.py`.

Two environment variables are required:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string, e.g. `postgresql://daise:daise@localhost:5432/daise` (the short `postgresql://` form is auto-upgraded to the psycopg3 driver). |
| `DAISE_SECRET_KEY` | Fernet master key used to encrypt credentials stored in the **cloud** mode. Generate one with `python -m app.src.security.crypto`. |

### Migrations & seeding

```bash
# create/upgrade the schema
alembic upgrade head

# seed the versioned prompts, set defaults, and import any legacy JSON
python -m scripts.migrate_json_to_pg
```

The migration script is idempotent and also imports legacy data from the old
JSON files (`data/repositories/*.json`, `data/config/llm_config.json`,
`prompts/prompts.json`) when present.

### Credential security

Provider credentials (Gemini/OpenAI API keys, GitHub token) can be stored in one
of two modes, chosen per credential in the UI:

* **cloud** — encrypted with `DAISE_SECRET_KEY` (Fernet) and kept in the
  `llm_config` table. Only ciphertext touches the database.
* **local** — kept only on the host in `data/config/llm_config_local.json`
  (gitignored), never sent to the database.

The API never returns secrets to the browser — only `hasKey`, a masked preview,
and the `storageMode`. The real value is resolved server-side when calling the
provider.

## Installation

To install AISE Docs, follow these steps:

1. Clone the repository to your local machine.
2. Navigate to the project directory and create a new Python virtual environment using `python -m venv .venv`.
3. Activate the virtual environment using `.venv/Scripts/activate` on Windows or `source .venv/bin/activate` on Linux.
4. Install the required dependencies using `pip install -r requirements.txt`.
5. Provision PostgreSQL and set `DATABASE_URL` + `DAISE_SECRET_KEY` in `.env` (see `.env.example`).
6. Apply migrations and seed: `alembic upgrade head && python -m scripts.migrate_json_to_pg`.
7. Start the Flask server by running `python server.py` (API on port `8765`).

### Configuration files

| Path | In Git? | Purpose |
|------|---------|---------|
| `config/models.json` | Yes | LLM model catalog shown in the UI |
| `.env` | No | `USE_LLM`, `DEBUG`, `DATABASE_URL`, `DAISE_SECRET_KEY` (see `.env.example`) |
| `data/config/llm_config_local.json` | No (`data/` is gitignored) | Credentials saved in **local** mode only |

## Usage Instructions

To use AISE Docs, follow these steps:

1. Open a web browser and navigate to the application's URL (e.g., `http://localhost:8080`).
2. Create a new project by clicking on the "New Project" button in the top navigation bar.
3. Enter a name for your project and click the "Create" button.
4. You can now add users to your project by clicking on the "Add User" button next to the project's name.
5. Add prompts to your project by clicking on the "New Prompt" button in the top navigation bar.
6. Enter a title and description for your prompt and click the "Create" button.
7. You can now view your prompts by clicking on the "View Prompts" button next to your project's name.
8. To start working on a prompt, select it from the list and click the "Start Working" button.
9. You will be taken to the prompt page where you can enter your responses and submit them when complete.

## License

AISE Docs is licensed under the MIT license.
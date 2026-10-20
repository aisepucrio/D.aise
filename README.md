# D.aise: An Automated README Generator from Source Code Repositories

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**D.aise** is a platform designed to automatically generate and update README files from source code repositories using Large Language Models (LLMs).

The system analyzes your repository structure, extracts relevant project information, and produces high-quality documentation in seconds. It supports local repositories, GitHub integration (import or clone), and works with both local LLMs (via Ollama) and remote LLM services (Gemini, OpenAI).

**Github Link** https://github.com/aisepucrio/d.aise

## 🎥 Demo

**Zenodo:** https://zenodo.org/records/20386248

**YouTube:** https://youtu.be/n51u9eG8PfY?si=0QOSlOHyjOE_q7iq

## 📋 Artifact Overview

D.aise provides an end-to-end workflow for automated README generation:

1. **Load a repository** — select a local folder, import metadata from the GitHub API, or clone a repository directly
2. **Analyze the project** — the LLM reads the repository file tree and content to extract project context
3. **Generate a README** — a prompt-driven agent produces a structured Markdown README
4. **Review and apply** — compare the generated version with the existing README, then apply it locally, commit it via Git, or push it directly to GitHub

The backend is built with Python (Flask) and exposes a REST API. The frontend is a modern Next.js + TypeScript web application.

## 📚 Documentation Structure

```
D.aise/
├── README.md                   ← This file: overview, setup, and configuration
├── frontend/README.md          ← Frontend usage guide and interface features
├── backend/README.md           ← Backend API documentation and architecture
└── experiments/experiments/    ← Research data: quality tests, usability results, transcriptions
```

- **[Main README.md](README.md)** (this file): Overview, setup, installation, and configuration
- **[Frontend README](https://github.com/aisepucrio/D.aise/blob/main/frontend/README.md)**: Next.js app setup, pages, and components
- **[Backend README](https://github.com/aisepucrio/D.aise/blob/main/backend/README.md)**: Flask API architecture, routes, and service layer
- **[Experiments](https://github.com/aisepucrio/D.aise/tree/main/experiments/experiments)**: Evaluation data from the research study

## ✨ Key Features

- **Automatic README generation** from repository structure using LLMs
- **Multiple repository sources**: local folder selection, GitHub API import, or Git clone
- **README update workflow**: generate, compare diff, and apply with one click
- **GitHub integration**: push the generated README directly to a remote repository via the GitHub Contents API
- **Git commit support**: commit the README locally with undo capability
- **Multi-provider LLM support**:
  - **Gemini** (Google) — via API key
  - **Ollama** — local self-hosted models (no API key required)
  - **OpenAI** — configuration available (provider integration in progress)
- **Prompt Library**: manage and reuse custom prompts for README generation
- **Configurable model catalog**: `config/models.json` lists available models per provider
- **Mockup mode**: run without a real LLM for development and testing (`USE_LLM=false`)

## 🏗️ Repository Organization

```
D.aise/
├── frontend/                        # Next.js Web Application
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── page.tsx             # Home — repository selection
│   │   │   ├── projects/page.tsx    # Project view and README generation
│   │   │   ├── prompt-lab/page.tsx  # Prompt editor and library
│   │   │   └── config-model/page.tsx # LLM provider and model configuration
│   │   ├── components/              # UI components (layout, features, common)
│   │   ├── context/                 # React context providers
│   │   ├── services/api.ts          # API client for backend communication
│   │   └── types/                   # TypeScript type definitions
│   ├── package.json
│   └── README.md
├── backend/                         # Python Flask API
│   ├── app/
│   │   └── src/
│   │       ├── control/             # Controllers (project, prompt, user)
│   │       ├── model/               # Data models
│   │       ├── routes/              # Flask route definitions
│   │       ├── service/             # Business logic and LLM agent
│   │       └── view/                # HTML templates (legacy UI)
│   ├── config/
│   │   └── models.json              # LLM model catalog (versioned)
│   ├── data/                        # Gitignored runtime data
│   │   └── config/llm_config.json  # Saved API keys and LLM preferences
│   ├── prompts/                     # Prompt mockups for development
│   ├── requirements.txt
│   ├── server.py                    # Flask application entry point
│   └── README.md
└── experiments/
    └── experiments/                 # Research evaluation data
        ├── [D.aise] Quality Tests.xlsx
        ├── [D.aise] Transcriptions.xlsx
        └── [D.aise] Usability Results.xlsx
```

## 🔧 System Requirements

### Required

- **Python** ≥ 3.10
- **Node.js** ≥ 18
- **npm** ≥ 9
- **Git** ≥ 2.0
- **PostgreSQL** ≥ 14 (or use Docker, which provisions it for you)

> **Prefer containers?** You can skip all of the above and run everything with Docker — see [Running with Docker](#-running-with-docker).

### LLM Provider (choose one)

| Provider | Requirement |
|----------|-------------|
| Gemini   | Google API key |
| Ollama   | [Ollama](https://ollama.com) installed and running locally |
| None     | Set `USE_LLM=false` to use mockup output (development only) |

## 💻 Minimum Hardware Requirements

The application itself is lightweight. Hardware requirements depend mainly on the selected LLM provider.

| Scenario | Minimum | Recommended |
|----------|---------|-------------|
| Remote LLM (Gemini/OpenAI) | 2 CPU cores, 4 GB RAM | 4 CPU cores, 8 GB RAM |
| Local LLM (Ollama, 7B–8B model) | 4 CPU cores, 16 GB RAM | 8 CPU cores, 32 GB RAM |

### Storage

- **Application:** ~2 GB
- **Docker images:** ~3–5 GB
- **Local LLM models (Ollama):** 4–8 GB per model (depending on the selected model)

> **Note:** Running local LLMs does not require a GPU, but inference will be significantly faster with one. A modern NVIDIA GPU with at least 8 GB of VRAM is recommended for better performance when using Ollama.

## 🚀 Installation and Configuration

### Step 1: Clone the Repository

```bash
git clone https://github.com/aisepucrio/D.aise.git
cd D.aise
```

### Step 2: Set Up the Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Backend environment variables

Create a `.env` file inside the `backend/` directory (see `backend/.env.example`):

```env
# Enable real LLM calls (set to false to use mockup output)
USE_LLM=true

# Debug mode
DEBUG=false

# PostgreSQL connection (short postgresql:// form is auto-upgraded to psycopg3)
DATABASE_URL=postgresql://daise:daise@localhost:5432/daise

# Master key to encrypt credentials saved in "cloud" mode.
# Generate one with: python -m app.src.security.crypto
DAISE_SECRET_KEY=
```

Then create the schema and seed the prompts:

```bash
alembic upgrade head
python -m scripts.migrate_json_to_pg
```

> **Note:** API keys and LLM preferences are configured through the web interface, not `.env`. Credentials are stored **encrypted in PostgreSQL** ("cloud" mode) or **locally on the host** (`backend/data/config/llm_config_local.json`, gitignored) — you choose per credential in the UI.

#### Configuration files

| Path | In Git? | Purpose |
|------|---------|---------|
| `backend/config/models.json` | Yes | LLM model catalog shown in the UI |
| `backend/.env` | No | `USE_LLM`, `DEBUG`, `DATABASE_URL`, `DAISE_SECRET_KEY`, `DAISE_BOOTSTRAP_*` |
| PostgreSQL (`users`, `auth_sessions`, `credentials`, `user_settings`, `projects`, `prompts`, `generations`, `review_decisions`) | — | All app data: accounts, per-user encrypted credentials, projects, prompt library, and generation history |
| `backend/data/config/llm_config_local.json` | No | Credentials saved in **local** mode only |

### Step 3: Set Up the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
```

Create a `.env.local` file inside the `frontend/` directory:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8765

# Set to "local" to enable the "Select Local Project" button
NEXT_PUBLIC_APP_MODE=local
```

### Step 4: Configure an LLM Provider

Start both servers (see Step 5), then open the app and navigate to **Config Model** to set up your LLM:

#### Gemini

1. Go to [Google AI Studio](https://aistudio.google.com/) and create an API key
2. In the app, select **Gemini** as the provider, paste the key, and choose a model

#### Ollama (local)

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull a model: `ollama pull llama3.1:8b`
3. In the app, select **Ollama**, set the endpoint (default: `http://localhost:11434`), and choose a model

#### GitHub Token (optional — for GitHub features)

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Generate a classic token with `repo` scope
3. In the app, paste the token in the GitHub token field

### Step 5: Start the Application

Run the backend and frontend in separate terminals:

**Backend** (runs on port `8765`):

```bash
cd backend
python server.py
```

**Frontend** (runs on port `3000`):

```bash
cd frontend
npm run dev
```

Open your browser at `http://localhost:3000`.

## 🐳 Running with Docker

The fastest way to get the whole stack running — no Python venv, Node, or `python-tk` setup required. Docker builds and runs the backend (Flask) and frontend (Next.js) together.

### Requirements

- **Docker Engine** ≥ 24 (or Docker Desktop)
- **Docker Compose v2** (the `docker compose` command, bundled with recent Docker)
- The **Buildx** plugin (ships with Docker Desktop; on a standalone CLI install it via `brew install docker-buildx` and link it into `~/.docker/cli-plugins`)

No local Python, Node, or Git installation is needed on the host — everything runs inside the containers.

### Quick start

Everything is configured through a single `.env` file at the repository root.

**1. Create your `.env`:**

```bash
cp .env.example .env
```

**2. Generate a master key** (encrypts credentials saved in "cloud" mode) and paste it into `.env` as `DAISE_SECRET_KEY`:

```bash
# with Python:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# or with Docker only (no Python needed):
docker run --rm python:3.12-slim sh -c "pip -q install cryptography && python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
```

**3. Bring the stack up:**

```bash
docker compose up --build
```

This builds the images and starts all three services. The backend **applies the
Alembic migrations and seeds the database automatically on boot** (creates the
tables, the 9 prompts, and the initial admin user).

| Service | URL | Container port → Host port |
|---------|-----|----------------------------|
| Frontend (Next.js) | http://localhost:3000 | 3000 → 3000 |
| Backend (Flask API) | http://localhost:8765 | 8765 → 8765 |
| PostgreSQL | (internal) | 5432 |

Open `http://localhost:3000`, and log in at `/login` with the admin credentials
from your `.env` (`DAISE_BOOTSTRAP_EMAIL` / `DAISE_BOOTSTRAP_PASSWORD`), or
register a new account.

> **Master key:** `docker compose up` fails on purpose if `DAISE_SECRET_KEY` is
> not set. Keep the same key across restarts, or previously encrypted
> credentials become unreadable.

### What to configure in `.env`

| Variable | Required | Purpose |
|----------|----------|---------|
| `DAISE_SECRET_KEY` | **Yes** | Fernet key that encrypts "cloud" credentials |
| `DAISE_BOOTSTRAP_EMAIL` / `DAISE_BOOTSTRAP_PASSWORD` | No (defaults) | Initial admin login |
| `USE_LLM` | No (default `true`) | `false` uses mockup output (no API calls) |
| `DEBUG` | No (default `false`) | Flask debug mode |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | No (defaults) | Database credentials |
| `NEXT_PUBLIC_API_URL` | No (default `http://localhost:8765`) | API URL reachable from the browser |

Open your browser at `http://localhost:3000`.

To stop the stack, press `Ctrl+C`, or run `docker compose down` from another terminal. To run it detached, use `docker compose up --build -d`.

### Configuration

- **Single `.env` at the repo root** — every setting (master key, admin login, `USE_LLM`, Postgres credentials, API URL) lives in the root `.env`. See [What to configure in `.env`](#what-to-configure-in-env) above. There is no separate `backend/.env` in the Docker flow.
- **LLM providers, API keys, and the GitHub token** — configure them through the web UI after logging in. They are stored **per user** in PostgreSQL: "cloud" credentials are encrypted with `DAISE_SECRET_KEY`; "local" credentials stay on the host in `backend/data/config/llm_config_local.json`. Both survive restarts (the DB lives in the `pgdata` volume).
- **Backend API URL** — the frontend reads `NEXT_PUBLIC_API_URL` at **build time** (the browser calls the API directly, so the URL must be reachable from your machine). Set it in `.env` and rebuild with `docker compose up --build`.

### Volumes (persisted data)

The following host directories are mounted into the backend container so data survives rebuilds:

| Volume / Host path | Container path | Contents |
|--------------------|----------------|----------|
| `pgdata` (named volume) | `/var/lib/postgresql/data` | PostgreSQL data (projects, prompts, history, encrypted config) |
| `backend/data/` | `/app/data` | Credentials saved in **local** mode |
| `backend/repositories/` | `/app/repositories` | Cloned/imported repositories |

> The database lives in the Docker-managed named volume `pgdata` (survives
> rebuilds). To wipe everything and start fresh: `docker compose down -v`.

> **Security note:** credentials saved in **cloud** mode are encrypted with `DAISE_SECRET_KEY` before being stored in PostgreSQL. Credentials saved in **local** mode live in `backend/data/config/llm_config_local.json` in plain text — keep that directory private and never commit it.

### Notes and limitations

- **"Select Local Project" is disabled in Docker.** That feature opens a native folder picker on the server (via Tkinter), which has no display inside a headless container. The Docker build sets `NEXT_PUBLIC_APP_MODE=docker` so the button is hidden. Use **Import from GitHub API** or **Clone Repository** instead — both work fully inside the container (the `git` binary is installed in the backend image).
- **Ollama:** if you use Ollama as the LLM provider, it runs on your host, not in these containers. From inside the backend container, reach it at `http://host.docker.internal:11434` instead of `http://localhost:11434`.
- **Rebuilding the frontend:** because `NEXT_PUBLIC_*` values are baked in at build time, any change to the API URL or app mode requires `docker compose up --build` (not just `up`).

## 🖥️ Usage

### Home Page — Load a Repository

Three options are available:

| Option | Description |
|--------|-------------|
| **Select Local Project** | Opens a folder picker to select a repository from your machine (requires `NEXT_PUBLIC_APP_MODE=local`) |
| **Import data from GitHub API** | Fetches repository metadata via the GitHub API without cloning |
| **Clone Repository** | Clones the remote repository locally for full file-tree access |

### Projects Page — Generate and Apply a README

After loading a repository:

1. **Analyze with LLM** — the agent reads the file tree and generates project context
2. **Generate README** — sends a prompt to the configured LLM and returns a draft README
3. **Review diff** — compare the new README with the existing one side by side
4. **Apply the README** — choose one of:
   - **Apply locally**: overwrite the `README.md` file on disk
   - **Git commit**: commit the file via GitPython
   - **Push to GitHub**: update `README.md` directly on the remote repository via the GitHub Contents API
   - **Undo commit**: revert the last commit if needed

### Prompt Lab — Custom Prompts

Navigate to `/prompt-lab` to write, edit, and reuse prompt templates for README generation.

### Config Model — LLM Settings

Navigate to `/config-model` to:

- Switch between **Gemini** and **Ollama** providers
- Select a specific model from the catalog
- Save API keys and endpoints 

## 📡 Backend API Endpoints

The Flask server runs on `http://localhost:8765`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects/` | List all saved projects |
| `GET` | `/projects/choose_local_repository` | Open folder picker dialog |
| `POST` | `/projects/save_project` | Save a project |
| `GET` | `/projects/<name>/get_tree` | Get file tree for a project |
| `POST` | `/projects/<name>/refresh_tree` | Refresh the file tree |
| `DELETE` | `/projects/<name>` | Delete a project |
| `POST` | `/projects/<name>/analyze_with_llm` | Analyze project with LLM |
| `POST` | `/projects/<name>/check_github_readme` | Check existing GitHub README |
| `POST` | `/projects/generate_readme` | Generate README content |
| `POST` | `/projects/update_readme` | Update existing README |
| `POST` | `/projects/apply_readme` | Apply README to local file |
| `POST` | `/projects/apply_readme_github` | Push README to GitHub |
| `POST` | `/projects/git_commit_readme` | Commit README via Git |
| `POST` | `/projects/undo_commit` | Undo last Git commit |
| `POST` | `/projects/import_github` | Import repository via GitHub API |
| `POST` | `/projects/clone_repository` | Clone a remote repository |
| `GET` | `/api/models` | List available LLM models by provider |
| `GET` | `/api/llm-config` | Get saved LLM configuration |
| `POST` | `/api/llm-config` | Save LLM configuration |
| `POST` | `/auth/register` | Register a user |
| `POST` | `/auth/login` | Log in, returns a bearer token |
| `POST` | `/auth/logout` | Revoke the current session |
| `GET` | `/auth/me` | Current user (requires bearer token) |
| `GET` | `/projects/<name>/history` | Generation history (with decisions) |
| `GET` | `/projects/<name>/generations/<id>` | Full generation detail (prompt sent + output) |
| `POST` | `/projects/<name>/decision` | Record an approve/reject decision |

## 📊 Experiments

The `experiments/experiments/` directory contains the research evaluation data from the D.aise study:

- **Quality Tests**: Evaluation of README quality metrics
- **Transcriptions**: Participant interview transcriptions
- **Usability Results**: System Usability Scale (SUS) and qualitative feedback

## ⚖️ License

MIT — see [LICENSE](LICENSE) for details.

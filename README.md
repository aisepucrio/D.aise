# D.aise: An Automated README Generator from Source Code Repositories

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**D.aise** is a platform designed to automatically generate and update README files from source code repositories using Large Language Models (LLMs).

The system analyzes your repository structure, extracts relevant project information, and produces high-quality documentation in seconds. It supports local repositories, GitHub integration (import or clone), and works with both local LLMs (via Ollama) and remote LLM services (Gemini, OpenAI).

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

> **Prefer containers?** You can skip all of the above and run everything with Docker — see [Running with Docker](#-running-with-docker).

### LLM Provider (choose one)

| Provider | Requirement |
|----------|-------------|
| Gemini   | Google API key |
| Ollama   | [Ollama](https://ollama.com) installed and running locally |
| None     | Set `USE_LLM=false` to use mockup output (development only) |

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

Create a `.env` file inside the `backend/` directory:

```env
# Enable real LLM calls (set to false to use mockup output)
USE_LLM=true

# Debug mode
DEBUG=false
```

> **Note:** API keys and LLM preferences are stored at runtime in `backend/data/config/llm_config.json` (gitignored). You do not need to put your API key in `.env` — configure it through the web interface instead.

#### Configuration files

| Path | In Git? | Purpose |
|------|---------|---------|
| `backend/config/models.json` | Yes | LLM model catalog shown in the UI |
| `backend/data/config/llm_config.json` | No | Saved API keys and LLM preferences (created on first save) |

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

From the repository root:

```bash
docker compose up --build
```

This builds both images and starts the services:

| Service | URL | Container port → Host port |
|---------|-----|----------------------------|
| Frontend (Next.js) | http://localhost:3000 | 3000 → 3000 |
| Backend (Flask API) | http://localhost:8765 | 8765 → 8765 |

Open your browser at `http://localhost:3000`.

To stop the stack, press `Ctrl+C`, or run `docker compose down` from another terminal. To run it detached, use `docker compose up --build -d`.

### Configuration

- **Backend `.env`** — the `backend` service reads `backend/.env` (same file used for the manual setup). Make sure it exists with at least `USE_LLM` and `DEBUG`. See [Backend environment variables](#backend-environment-variables).
- **LLM providers, API keys, and the GitHub token** — configure them through the web UI exactly as in the manual setup. They are persisted to `backend/data/config/llm_config.json` on the host (see Volumes below), so they survive container restarts and rebuilds.
- **Backend API URL** — the frontend reads `NEXT_PUBLIC_API_URL` at **build time** (the browser calls the API directly, so the URL must be reachable from your machine, not from inside the Docker network). It defaults to `http://localhost:8765`. To point the frontend at a different host/port, edit the `args` under the `frontend` service in `docker-compose.yml` and rebuild (`docker compose up --build`).

### Volumes (persisted data)

The following host directories are mounted into the backend container so data survives rebuilds:

| Host path | Container path | Contents |
|-----------|----------------|----------|
| `backend/data/` | `/app/data` | Saved API keys, GitHub token, and LLM preferences |
| `backend/repositories/` | `/app/repositories` | Cloned/imported repositories |

> **Security note:** `backend/data/config/llm_config.json` stores credentials (including the GitHub token) in plain text. Keep this directory private and never commit it.

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

## 📊 Experiments

The `experiments/experiments/` directory contains the research evaluation data from the D.aise study:

- **Quality Tests**: Evaluation of README quality metrics
- **Transcriptions**: Participant interview transcriptions
- **Usability Results**: System Usability Scale (SUS) and qualitative feedback

## ⚖️ License

MIT — see [LICENSE](LICENSE) for details.

import re
import requests
from datetime import datetime, timezone

BASE_URL = "https://api.github.com"

IGNORED_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "poetry.lock", "composer.lock", "Gemfile.lock"
}

CHANGE_TYPE_MAP = {
    "added": "Added",
    "modified": "Modified",
    "removed": "Deleted",
    "renamed": "Renamed",
}


class GithubService:
    def __init__(self, token: str = ""):
        self.headers = {"Accept": "application/vnd.github+json"}
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    # ================================================================
    # URL / INFO
    # ================================================================

    def parse_url(self, url: str) -> tuple[str, str]:
        """
        Extrai (owner, repo) de uma URL do GitHub.
        Aceita: https://github.com/owner/repo  ou  https://github.com/owner/repo.git
        Lança ValueError para URLs inválidas.
        """
        match = re.match(r"https://github\.com/([\w\-\.]+)/([\w\-\.]+?)(?:\.git)?/?$", url.strip())
        if not match:
            raise ValueError("URL inválida. Use o formato https://github.com/usuario/repositorio")
        return match.group(1), match.group(2)

    def get_repo_info(self, owner: str, repo: str) -> dict:
        """
        GET /repos/{owner}/{repo}
        Retorna dict com name, description, language, default_branch.
        Lança RuntimeError com mensagem adequada para 401/403/404.
        """
        resp = requests.get(f"{BASE_URL}/repos/{owner}/{repo}", headers=self.headers, timeout=15)
        self._raise_for_status(resp)
        data = resp.json()
        return {
            "name": data.get("name", ""),
            "description": data.get("description") or "",
            "language": data.get("language") or "",
            "default_branch": data.get("default_branch", "main"),
        }

    def get_tree(self, owner: str, repo: str, branch: str) -> str:
        """
        GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
        Retorna string no estilo unix tree.
        """
        resp = requests.get(
            f"{BASE_URL}/repos/{owner}/{repo}/git/trees/{branch}",
            headers=self.headers,
            params={"recursive": "1"},
            timeout=15
        )
        self._raise_for_status(resp)
        items = resp.json().get("tree", [])

        # Monta string de árvore simples (só paths, sem ASCII art complexo)
        lines = []
        for item in items:
            path = item.get("path", "")
            # Ignora pastas ocultas / node_modules / venv
            parts = path.split("/")
            if any(p.startswith(".") or p in {"node_modules", "venv", "__pycache__", "dist", "build"} for p in parts):
                continue
            indent = "    " * (len(parts) - 1)
            lines.append(f"{indent}{'└── ' if len(parts) > 1 else ''}{parts[-1]}")

        return "\n".join(lines)

    # ================================================================
    # COMMITS — helpers internos
    # ================================================================

    def _get_commits_list(self, owner: str, repo: str, range_type: str,
                          start_date: str | None, end_date: str | None,
                          start_sha: str | None, end_sha: str | None) -> list[dict]:
        """
        Busca lista de commits (sha + mensagem) conforme o range_type.
        Retorna lista de dicts com: sha, title, description.
        """
        params: dict = {"per_page": 30}

        if range_type in ("date_range", "since_last_readme"):
            if start_date:
                params["since"] = self._to_iso_z(start_date)
            if end_date:
                params["until"] = self._to_iso_z(end_date)

        elif range_type == "hash_range":
            if not start_sha or not end_sha:
                return []
            # Lista commits entre dois SHAs via compare
            resp = requests.get(
                f"{BASE_URL}/repos/{owner}/{repo}/compare/{start_sha}...{end_sha}",
                headers=self.headers,
                timeout=15
            )
            self._raise_for_status(resp)
            raw_commits = resp.json().get("commits", [])
            return [self._parse_commit_meta(c) for c in raw_commits]

        else:
            return []

        resp = requests.get(
            f"{BASE_URL}/repos/{owner}/{repo}/commits",
            headers=self.headers,
            params=params,
            timeout=15
        )
        self._raise_for_status(resp)
        return [self._parse_commit_meta(c) for c in resp.json()]

    def _get_commit_detail(self, owner: str, repo: str, sha: str) -> dict:
        """GET /repos/{owner}/{repo}/commits/{sha} — arquivos + patches."""
        resp = requests.get(
            f"{BASE_URL}/repos/{owner}/{repo}/commits/{sha}",
            headers=self.headers,
            timeout=15
        )
        self._raise_for_status(resp)
        return resp.json()

    def _parse_commit_meta(self, c: dict) -> dict:
        message = c.get("commit", {}).get("message", "")
        lines = message.split("\n", 1)
        return {
            "sha": c.get("sha", ""),
            "title": lines[0].strip(),
            "description": lines[1].strip() if len(lines) > 1 else "",
        }

    def _file_label(self, status: str) -> str:
        return CHANGE_TYPE_MAP.get(status, "Changed")

    def _to_iso_z(self, dt_str: str) -> str:
        """Converte '2024-01-01 10:00:00' ou ISO para formato aceito pela API do GitHub."""
        try:
            dt = datetime.fromisoformat(dt_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            return dt_str

    # ================================================================
    # COMMITS — métodos públicos (mesmos formatos do GitPython)
    # ================================================================

    def get_commits_title_description(
        self, owner: str, repo: str, range_type: str,
        start_date: str | None = None, end_date: str | None = None,
        start_sha: str | None = None, end_sha: str | None = None
    ) -> str:
        """
        Busca commits usando apenas o endpoint de lista — 1 chamada, sem N+1.
        Formato:
          Title: ...
          Description: ...
          Commit: <sha>
        """
        commits = self._get_commits_list(owner, repo, range_type, start_date, end_date, start_sha, end_sha)
        if not commits:
            return ""

        lines = []
        for c in commits:
            lines.append(f"Title: {c['title']}")
            if c["description"]:
                lines.append(f"Description: {c['description']}")
            lines.append(f"Commit: {c['sha']}")
            lines.append("")

        return "\n".join(lines).strip()

    def _get_compare(self, owner: str, repo: str, base: str, head: str) -> dict:
        """GET /repos/{owner}/{repo}/compare/{base}...{head}"""
        resp = requests.get(
            f"{BASE_URL}/repos/{owner}/{repo}/compare/{base}...{head}",
            headers=self.headers,
            timeout=20
        )
        self._raise_for_status(resp)
        return resp.json()

    def get_commits_with_compare(
        self, owner: str, repo: str, range_type: str,
        start_date: str | None = None, end_date: str | None = None,
        start_sha: str | None = None, end_sha: str | None = None
    ) -> str:
        """
        Busca commits + diffs combinados via endpoint /compare — máximo 2 chamadas, sem N+1.

        Para hash_range: 1 chamada direta ao compare.
        Para date_range/since_last_readme: 1 chamada de lista para obter SHAs + 1 compare.

        Formato de saída:
          ====== COMMITS ======
          Commit: <sha>
          Title: ...
          Description: ...

          ====== CHANGES ======
          path/file.py (Modified)
          @@ ... @@
          ...
        """
        if range_type == "hash_range":
            if not start_sha or not end_sha:
                return ""
            data = self._get_compare(owner, repo, start_sha, end_sha)
            raw_commits = [self._parse_commit_meta(c) for c in data.get("commits", [])]
            files = data.get("files", [])
        else:
            # Busca lista de commits para obter SHAs extremos
            commits_list = self._get_commits_list(
                owner, repo, range_type, start_date, end_date, start_sha, end_sha
            )
            if not commits_list:
                return ""
            if len(commits_list) == 1:
                # Só um commit: compare contra o pai
                data = self._get_compare(owner, repo, f"{commits_list[0]['sha']}~1", commits_list[0]["sha"])
            else:
                # GitHub retorna commits do mais novo para o mais antigo
                newest_sha = commits_list[0]["sha"]
                oldest_sha = commits_list[-1]["sha"]
                # ~1 inclui o commit mais antigo no diff
                data = self._get_compare(owner, repo, f"{oldest_sha}~1", newest_sha)
            raw_commits = commits_list  # já temos os metadados da lista
            files = data.get("files", [])

        if not raw_commits:
            return ""

        output_lines = ["====== COMMITS ======\n"]
        for c in raw_commits:
            output_lines.append(f"Commit: {c['sha']}")
            output_lines.append(f"Title: {c['title']}")
            if c["description"]:
                output_lines.append(f"Description: {c['description']}")
            output_lines.append("")

        output_lines.append("====== CHANGES ======\n")
        for f in files:
            fname = f.get("filename", "")
            if fname.split("/")[-1] in IGNORED_FILES:
                continue
            output_lines.append(f"{fname} ({self._file_label(f.get('status', ''))})")
            patch = f.get("patch", "")
            if patch:
                output_lines.append(patch)
            output_lines.append("")

        return "\n".join(output_lines).strip()

    # ================================================================
    # WRITE
    # ================================================================

    def create_or_update_readme(self, owner: str, repo: str, content_str: str, commit_message: str) -> dict:
        """Creates or updates README.md in the GitHub repository via the Contents API."""
        import base64

        url = f"{BASE_URL}/repos/{owner}/{repo}/contents/README.md"

        # Check if README already exists — updates require the current file SHA
        resp = requests.get(url, headers=self.headers, timeout=10)
        sha = resp.json().get("sha") if resp.status_code == 200 else None

        encoded = base64.b64encode(content_str.encode("utf-8")).decode("utf-8")
        payload = {"message": commit_message, "content": encoded}
        if sha:
            payload["sha"] = sha

        resp = requests.put(url, json=payload, headers=self.headers, timeout=20)
        self._raise_for_status(resp)
        return resp.json()

    # ================================================================
    # README
    # ================================================================

    def check_readme_exists(self, owner: str, repo: str) -> bool:
        """
        GET /repos/{owner}/{repo}/readme — verifica apenas se o README existe.
        Retorna True se existir, False se não (404) ou erro.
        """
        resp = requests.get(
            f"{BASE_URL}/repos/{owner}/{repo}/readme",
            headers=self.headers,
            timeout=10
        )
        return resp.status_code == 200

    def get_readme_content(self, owner: str, repo: str) -> str:
        """
        GET /repos/{owner}/{repo}/readme
        Retorna o conteúdo do README do repositório, ou "" se não existir.
        """
        import base64
        resp = requests.get(
            f"{BASE_URL}/repos/{owner}/{repo}/readme",
            headers=self.headers,
            timeout=15
        )
        if resp.status_code == 404:
            return ""
        self._raise_for_status(resp)
        data = resp.json()
        content_b64 = data.get("content", "")
        encoding = data.get("encoding", "base64")
        if encoding == "base64" and content_b64:
            return base64.b64decode(content_b64).decode("utf-8", errors="replace")
        return ""

    # ================================================================
    # Error handling
    # ================================================================

    def _raise_for_status(self, resp: requests.Response):
        if resp.status_code == 401:
            raise RuntimeError("Token inválido ou repositório privado sem autenticação.")
        if resp.status_code == 403:
            raise RuntimeError("Rate limit da API do GitHub excedido. Configure um token nas configurações.")
        if resp.status_code == 404:
            raise RuntimeError("Repositório não encontrado ou privado.")
        if not resp.ok:
            raise RuntimeError(f"Erro na API do GitHub: {resp.status_code} {resp.text[:200]}")

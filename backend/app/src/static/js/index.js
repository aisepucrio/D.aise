// variável global para armazenar os projetos carregados
let projects = [];
let projectTrees = {};
let createdReadmeContent = ""
let currentReadmeContent = ""
let updatedReadmeContent = ""
let readmeTarget = null;
let lastCommitHash = null;
let pendingReadmeContent = "";

let selectedProjectFolder = null;
let isProjectsCollapsed = false;
let lastCommittedGithubToken = "";

async function getLlmConfigPayload() {
  const fallback = { llm_provider: "gemini", model: "", api_key: "", ollama_url: "", github_token: "" };
  try {
    const res = await fetch("/models/api/llm-config");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const lsc = data.__lastSavedConfig || {};
    let provider = String(lsc.provider || "gemini").toLowerCase();

    // OpenAI ainda não está implementado no backend — fallback para Gemini
    if (!["gemini", "ollama"].includes(provider)) {
      provider = "gemini";
    }

    const providerCred = data[provider] || {};
    const ollamaCred = data.ollama || {};

    return {
      llm_provider: provider,
      model: String(lsc.model || "").trim(),
      api_key: String(providerCred.committedApiKey || "").trim(),
      ollama_url: String(ollamaCred.committedEndpoint || "").trim(),
      github_token: String((data.github || {}).committedToken || "").trim(),
    };
  } catch (err) {
    console.warn("Falha ao buscar llm_config do servidor:", err);
    return fallback;
  }
}


function print(param) {
  console.log(param)
}

// ================== util: copiar valor de input para clipboard
function copyInputValue(inputId) {
  const input = document.getElementById(inputId);
  if (!input) {
    console.error(`copyInputValue: input "${inputId}" não encontrado`);
    return;
  }

  const value = input.value || "";

  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    // fallback simples caso API não esteja disponível
    input.select();
    try {
      document.execCommand("copy");
      alert(`Copied: ${value}`);
    } catch (e) {
      console.error("Falha ao copiar para o clipboard:", e);
      alert("Não foi possível copiar o texto.");
    }
    return;
  }

  navigator.clipboard.writeText(value)
    .then(() => {
      alert(`Copied: ${value}`);
    })
    .catch(err => {
      console.error("Erro ao copiar para o clipboard:", err);
      alert("Não foi possível copiar o texto.");
    });
}


// ================== salvar projeto
async function callSaveProject() {
  window.alert("salvará");
  const data = {
    id: document.getElementById("id")?.value || null,
    path: document.getElementById("path").value,
    name: document.getElementById("name").value,
    folder_name: document.getElementById("folder_name").value,
    description: document.getElementById("description").value,
    language: document.getElementById("language").value,
    framework: document.getElementById("framework").value,
    dependence_file_name: document.getElementById("dependence_file_name").value,
    main_file: document.getElementById("main_file").value,
    has_readme: document.getElementById("has_readme").value,
  };

  try {
    const res = await fetch("/projects/save_project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    const savedProject = result.project;
    console.log("saved project");
    console.log(savedProject);
    alert(result.message || "Projeto salvo!");

    document.getElementById("id").value = savedProject.id;
    // Atualiza o array global com os dados novos
    const index = projects.findIndex((p) => p.folder_name === data.folder_name);
    if (index !== -1) {
      projects[index] = savedProject; // substitui o projeto existente
    } else {
      projects.push(savedProject); // adiciona novo projeto
    }

    // Re-renderiza a lista de projetos
    renderProjectList(projects);
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar o projeto");
  }
}

// ================== selecionar projeto local
async function callSelectFolder() {
  try {
    const res = await fetch("/projects/choose_local_repository");
    const data = await res.json();
    print(data)
    if (data.status === 200) {
      loadProjectIntoForm(data.project);
    } else if (data.status === 409) {
      alert("repositorio ja existente")
    }
    else {
      alert(data.message || "Erro ao carregar repositório");
    }

  } catch (err) {
    console.error(err);
  }
}

// ================== modal Import from Github
function openGithubImportModal() {
  document.getElementById("githubImportModal").style.display = "flex";
}

function closeGithubImportModal() {
  document.getElementById("githubImportModal").style.display = "none";
}

// ================== importar repositório do GitHub
async function importFromGithub() {
  const url = document.getElementById("githubUrlInput").value.trim();
  if (!url) {
    alert("Cole a URL do repositório do GitHub.");
    return;
  }

  const btn = document.getElementById("btnImportGithub");
  const loading = document.getElementById("githubImportLoading");
  btn.disabled = true;
  loading.style.display = "inline";

  try {
    const { github_token = "" } = await getLlmConfigPayload();
    const res = await fetch("/projects/import_github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, github_token }),
    });

    const data = await res.json();

    if (data.status === 200) {
      closeGithubImportModal();
      document.getElementById("githubUrlInput").value = "";
      loadProjectIntoForm(data.project);
    } else if (data.status === 409) {
      alert("Repositório já está salvo no sistema.");
      if (data.project) loadProjectIntoForm(data.project);
    } else {
      alert(data.message || "Erro ao importar repositório.");
    }
  } catch (err) {
    console.error(err);
    alert("Erro de conexão ao importar repositório.");
  } finally {
    btn.disabled = false;
    loading.style.display = "none";
  }
}

async function cloneFromGithub() {
  const url = document.getElementById("githubUrlInput").value.trim();

  if (!url) {
    alert("Cole a URL do repositório do GitHub.");
    return;
  }

  const btn = document.getElementById("btnImportGithub");
  const loading = document.getElementById("githubImportLoading");

  btn.disabled = true;
  loading.style.display = "inline";

  try {
    const { github_token = "" } = await getLlmConfigPayload();

    const res = await fetch("/projects/clone_repository", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, github_token }),
    });

    const data = await res.json();

    // sucesso
    if (res.status === 201 || res.status === 200) {

      const savedProject = data.project;

      closeGithubImportModal();

      document.getElementById("githubUrlInput").value = "";

      // carrega no formulário
      loadProjectIntoForm(savedProject);

      // atualiza array global
      const index = projects.findIndex(
        (p) => p.folder_name === savedProject.folder_name
      );

      if (index !== -1) {
        projects[index] = savedProject;
      } else {
        projects.push(savedProject);
      }

      // rerender lista
      renderProjectList(projects);

      alert(data.message || "Repositório clonado com sucesso.");
    }

    // já existe
    else if (res.status === 409) {

      alert(data.message || "Repositório já existe.");

      if (data.project) {

        loadProjectIntoForm(data.project);

        const index = projects.findIndex(
          (p) => p.folder_name === data.project.folder_name
        );

        if (index !== -1) {
          projects[index] = data.project;
        } else {
          projects.push(data.project);
        }

        renderProjectList(projects);
      }
    }

    // erro genérico
    else {
      alert(data.message || "Erro ao clonar repositório.");
    }

  } catch (err) {
    console.error(err);
    alert("Erro de conexão ao clonar repositório.");

  } finally {
    btn.disabled = false;
    loading.style.display = "none";
  }
} 


function syncGithubTokenClearButton() {
  const input = document.getElementById("mainGithubTokenInput");
  const clr = document.getElementById("btnClearGithubToken");
  if (!clr || !input) return;
  const hasAnything =
    (lastCommittedGithubToken || "").length > 0 || (input.value || "").trim().length > 0;
  clr.disabled = !hasAnything;
}

function syncGithubTokenSaveButton() {
  const input = document.getElementById("mainGithubTokenInput");
  const btn = document.getElementById("btnSaveMainGithubToken");
  const icon = document.getElementById("githubTokenSaveIcon");
  if (!input || !btn || !icon) return;
  const v = (input.value || "").trim();
  btn.disabled = !v;
  const matchesSaved = v.length > 0 && v === lastCommittedGithubToken;
  icon.textContent = matchesSaved ? "\u2713" : "+";
  btn.classList.toggle("is-token-saved", matchesSaved);
  btn.setAttribute("aria-label", matchesSaved ? "Token salvo no servidor" : "Adicionar ou atualizar token");
  syncGithubTokenClearButton();
}

async function clearGithubToken() {
  const input = document.getElementById("mainGithubTokenInput");
  const eye = document.getElementById("btnToggleGithubTokenVisibility");
  try {
    const res = await fetch("/models/api/llm-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ github: { token: "", committedToken: "" } }),
    });
    if (!res.ok) {
      alert("Não foi possível remover o token no servidor.");
      return;
    }
  } catch (err) {
    console.error("Erro ao limpar token:", err);
    alert("Erro de rede ao remover o token.");
    return;
  }
  lastCommittedGithubToken = "";
  if (input) {
    input.value = "";
    input.type = "password";
  }
  syncGithubTokenEyeIcon();
  syncGithubTokenSaveButton();
}

function toggleGithubTokenAccordion() {
  const panel = document.getElementById("githubTokenPanel");
  const header = document.getElementById("githubTokenAccordionHeader");
  const arrow = document.getElementById("githubTokenAccordionArrow");
  const acc = document.getElementById("githubTokenAccordion");
  if (!panel || !header) return;
  const open = panel.hasAttribute("hidden");
  if (open) {
    panel.removeAttribute("hidden");
    header.setAttribute("aria-expanded", "true");
    if (arrow) arrow.classList.remove("collapsed");
    if (acc) acc.classList.add("github-token-accordion--open");
  } else {
    panel.setAttribute("hidden", "");
    header.setAttribute("aria-expanded", "false");
    if (arrow) arrow.classList.add("collapsed");
    if (acc) acc.classList.remove("github-token-accordion--open");
  }
}

function syncGithubTokenEyeIcon() {
  const input = document.getElementById("mainGithubTokenInput");
  const btn = document.getElementById("btnToggleGithubTokenVisibility");
  const openWrap = document.getElementById("githubTokenEyeVisible");
  const offWrap = document.getElementById("githubTokenEyeHidden");
  if (!input || !btn || !openWrap || !offWrap) return;
  const masked = input.type === "password";
  openWrap.hidden = masked;
  offWrap.hidden = !masked;
  if (masked) {
    btn.setAttribute("aria-label", "Mostrar token");
    btn.title = "Mostrar token";
  } else {
    btn.setAttribute("aria-label", "Ocultar token");
    btn.title = "Ocultar token";
  }
}

function toggleMainGithubTokenVisibility() {
  const input = document.getElementById("mainGithubTokenInput");
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  syncGithubTokenEyeIcon();
}

// ================== GitHub token na tela principal
async function saveGithubToken() {
  const input = document.getElementById("mainGithubTokenInput");
  const btn = document.getElementById("btnSaveMainGithubToken");
  const v = (input?.value || "").trim();
  if (!v) return;

  if (btn) btn.disabled = true;
  try {
    await fetch("/models/api/llm-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ github: { token: v, committedToken: v } }),
    });
    lastCommittedGithubToken = v;
    syncGithubTokenSaveButton();
  } catch (err) {
    console.error("Erro ao salvar token:", err);
  } finally {
    if (input && btn) {
      btn.disabled = !(input.value || "").trim();
      syncGithubTokenSaveButton();
    }
  }
}

// ================== carregar lista de projetos
document.addEventListener("DOMContentLoaded", async () => {
  // Carrega projetos
  try {
    const res = await fetch("/projects/");
    projects = await res.json();
    renderProjectList(projects);
  } catch (err) {
    console.error("Erro ao carregar projetos:", err);
  }

  // Pré-preenche o token do GitHub se já estiver salvo
  try {
    const res = await fetch("/models/api/llm-config");
    if (res.ok) {
      const data = await res.json();
      const saved = String(data.github?.committedToken || "").trim();
      const tokenInput = document.getElementById("mainGithubTokenInput");
      if (saved && tokenInput) tokenInput.value = saved;
      lastCommittedGithubToken = saved;
      syncGithubTokenSaveButton();
    }
  } catch (_) {}

  const tokenInput = document.getElementById("mainGithubTokenInput");
  if (tokenInput) {
    tokenInput.addEventListener("input", () => syncGithubTokenSaveButton());
  }
  syncGithubTokenEyeIcon();
});

document.getElementById("projectsHeader").onclick = () => {
  isProjectsCollapsed = !isProjectsCollapsed;

  document
    .getElementById("projectsArrow")
    .classList.toggle("collapsed", isProjectsCollapsed);

  renderProjectList(projects);
};


// ================== função de renderização da lista

function renderProjectList(projects) {
  const listContainer = document.getElementById("savedProjectsList");
  listContainer.innerHTML = "";

  projects.forEach((project) => {
    const projectDiv = document.createElement("div");
    projectDiv.classList.add("saved-project");

    // selecionado
    if (project.folder_name === selectedProjectFolder) {
      projectDiv.classList.add("selected");
    }

    // lógica de recolher
    if (
      isProjectsCollapsed &&
      project.folder_name !== selectedProjectFolder
    ) {
      projectDiv.classList.add("hidden");
    }

    const infoDiv = document.createElement("div");
    infoDiv.classList.add("project-info");
    infoDiv.innerHTML = `
      <strong>${project.name}</strong><br>
      Linguagem: ${project.language || "N/A"}<br>
      Framework: ${project.framework || "N/A"}
    `;

    infoDiv.onclick = () => {
      selectedProjectFolder = project.folder_name;
      loadProjectIntoForm(project);
      renderProjectList(projects);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete-btn");
    deleteBtn.textContent = "Excluir";

    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(`Excluir o projeto "${project.name}"?`)) return;

      try {
        const res = await fetch(`/projects/${project.folder_name}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error();

        projects = projects.filter(
          (p) => p.folder_name !== project.folder_name
        );

        if (selectedProjectFolder === project.folder_name) {
          selectedProjectFolder = null;
        }

        renderProjectList(projects);
      } catch {
        alert("Erro ao excluir o projeto");
      }
    };

    projectDiv.appendChild(infoDiv);
    projectDiv.appendChild(deleteBtn);
    listContainer.appendChild(projectDiv);
  });
}


// ================== carregar projeto no form
async function loadProjectIntoForm(project) {
  const container = document.getElementById("projectContainer");
  container.style.display = "flex";

  // Limpa resultados de README do projeto anterior
  const readmeResult = document.getElementById("readmeResultContainer");
  readmeResult.style.display = "none";
  document.getElementById("readmeOutput").value = "";
  document.getElementById("readmePreview").innerHTML = "";

  const diffContainer = document.getElementById("readmeDiffContainer");
  diffContainer.style.display = "none";
  document.getElementById("oldReadmeOutput").value = "";
  document.getElementById("newReadmeOutput").value = "";
  document.getElementById("oldReadmePreview").innerHTML = "";
  document.getElementById("newReadmePreview").innerHTML = "";

  // Preenche os campos do formulário
  document.getElementById("id").value = project.id || "";
  document.getElementById("path").value = project.path || "";
  document.getElementById("name").value = project.name || "";
  document.getElementById("folder_name").value = project.folder_name || "";
  document.getElementById("description").value = project.description || "";
  document.getElementById("language").value = project.language || "";
  document.getElementById("framework").value = project.framework || "";
  document.getElementById("dependence_file_name").value =
    project.dependence_file_name || "";
  document.getElementById("main_file").value = project.main_file || "";
  document.getElementById("has_readme").value = project.has_readme || "";
  document.getElementById("project_source").value = project.source || "local";

  // Oculta path e folder_name para projetos GitHub (não fazem sentido sem repositório local)
  const isGithub = project.source === "github";
  document.getElementById("pathField").style.display = isGithub ? "none" : "";
  document.getElementById("folderNameField").style.display = isGithub ? "none" : "";

  if (isGithub) {
    checkGithubReadmeStatus(project.folder_name);
  } else {
    updateReadmeButtonsState();
  }

  // Mostra botão de atualizar árvore só para projetos GitHub
  const btnRefresh = document.getElementById("btnRefreshTree");
  const refreshMsg = document.getElementById("refreshTreeMsg");
  btnRefresh.style.display = isGithub ? "inline-block" : "none";
  refreshMsg.style.display = "none";
  refreshMsg.textContent = "";

  const treeDiv = document.getElementById("projectTree");

  // 1️⃣ se o projeto já tem a árvore, mostra direto
  if (project.tree && project.tree.trim() !== "") {
    treeDiv.textContent = project.tree;
    projectTrees[project.folder_name] = project.tree; // guarda em memória
    return;
  }

  // 2️⃣ se a árvore já foi buscada antes, mostra
  if (projectTrees[project.folder_name]) {
    treeDiv.textContent = projectTrees[project.folder_name];
    return;
  }

  // 3️⃣ se ainda não temos a árvore, buscar do backend
  try {
    console.log(`🌲 Buscando árvore: /projects/${project.folder_name}/get_tree`);

    const res = await fetch(`/projects/${project.folder_name}/get_tree`);
    const data = await res.json();

    // ❌ erro HTTP
    if (!res.ok) {
      alert(data.error || "Erro ao buscar árvore do projeto.");
      treeDiv.textContent = "Erro ao carregar árvore.";
      return;
    }

    // ✅ sucesso
    const tree = data.tree || "";

    projectTrees[project.folder_name] = tree;
    treeDiv.textContent = tree;

  } catch (err) {
    console.error("Erro ao carregar árvore:", err);
    alert("Erro de comunicação com o servidor.");
    treeDiv.textContent = "Erro ao carregar árvore.";
  }
}

async function refreshTree() {
  const folderName = document.getElementById("folder_name").value;
  if (!folderName) return;

  const btn = document.getElementById("btnRefreshTree");
  const msg = document.getElementById("refreshTreeMsg");
  btn.disabled = true;
  btn.textContent = "Atualizando...";
  msg.style.display = "none";

  try {
    const res = await fetch(`/projects/${folderName}/refresh_tree`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.error || "Erro ao atualizar árvore.";
      msg.style.color = "var(--color-error, #e05252)";
      msg.style.display = "inline";
      return;
    }

    if (!data.changed) {
      msg.textContent = "Nenhuma mudança detectada na árvore.";
      msg.style.color = "var(--color-text-secondary, #888)";
      msg.style.display = "inline";
    } else {
      const treeDiv = document.getElementById("projectTree");
      treeDiv.textContent = data.tree;
      projectTrees[folderName] = data.tree;
      msg.textContent = "Árvore atualizada com sucesso.";
      msg.style.color = "var(--color-success, #4caf50)";
      msg.style.display = "inline";
    }

    setTimeout(() => { msg.style.display = "none"; }, 4000);
  } catch (err) {
    console.error("Erro ao atualizar árvore:", err);
    msg.textContent = "Erro de comunicação com o servidor.";
    msg.style.color = "var(--color-error, #e05252)";
    msg.style.display = "inline";
  } finally {
    btn.disabled = false;
    btn.textContent = "↻ Atualizar árvore";
  }
}

function showLoadingModal() {
  document.getElementById("loadingModal").style.display = "flex";
}

function hideLoadingModal() {
  document.getElementById("loadingModal").style.display = "none";
}

async function callAnalyzeRepositoryWithLLM() {
  const folderName = document.getElementById("folder_name").value;
  if (!folderName) return alert("Selecione um projeto primeiro.");


  document.getElementById("loadingModal").style.display = "flex";

  // window.alert(window.USE_LLM)

  if (!window.USE_LLM) {
    // window.alert("LLM desativada (mock mode)");

    setTimeout(() => {
      alert("Using LLM: False\nReturning mock");
      document.getElementById("loadingModal").style.display = "none";
    }, 500);
    return
  }


  try {
    const llmConfig = await getLlmConfigPayload();
    const res = await fetch(`/projects/${folderName}/analyze_with_llm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ llm_config: llmConfig }),
    });
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
    const data = await res.json();

    console.log("Resultado da análise:", data);

    // Atualiza os inputs com os dados do JSON
    document.getElementById("language").value = data.language || "";
    document.getElementById("framework").value = data.framework || "";
    document.getElementById("main_file").value = data.main_file || "";
    document.getElementById("dependence_file_name").value = (
      data.dependency_files || []
    ).join(", ");
    document.getElementById("has_readme").value = data.has_readme; // ? "Sim" : "Não";
    updateReadmeButtonsState();
  } catch (err) {
    console.error(err);
    alert("Erro ao analisar o projeto.");
  } finally {
    document.getElementById("loadingModal").style.display = "none";
  }
}

async function callOpenFolderInExplorer(path) {
  if (!path) return alert("Nenhum caminho definido.");

  try {
    const res = await fetch("/projects/open_folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });

    const data = await res.json();
    console.log("data:: ");
    console.log(data);
    alert(data.message || "Operação concluída.");

    if (data.status === "error") {
      console.error("Erro:", data.message);
    } else {
      console.log("Pasta aberta:", data);
    }
  } catch (err) {
    console.error("Erro no fetch:", err);
    alert("Falha ao tentar abrir a pasta.");
  }
}

function openTab(event, tabId) {
  const tabs = document.querySelectorAll(".tab-content");
  const buttons = document.querySelectorAll(".tab-btn");

  tabs.forEach((tab) => tab.classList.remove("active"));
  buttons.forEach((btn) => btn.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  event.currentTarget.classList.add("active");
}

//  README ========================
// open generate readme model

function openReadmeModal() {
  document.getElementById("readmeModal").style.display = "block";
}

function closeReadmeModal() {
  document.getElementById("readmeModal").style.display = "none";
}

async function generateReadme() {
  const modal = document.getElementById("readmeModal");

  // Campos selecionados pelo usuário
  const selected = Array.from(
    document.querySelectorAll("#readmeForm input[type='checkbox']:checked")
  ).map(c => c.value);

  if (selected.length === 0) {
    return alert("Selecione pelo menos um campo para gerar o README.");
  }

  modal.style.display = "none";
  showLoadingModal();

  try {
    const projectData = {};

    // Adiciona SOMENTE os campos selecionados
    selected.forEach(field => {
      if (field === "tree") {
        projectData.tree = true;  // flag especial
      } else {
        const input = document.getElementById(field);
        if (input) {
          projectData[field] = input.value;
        }
      }
    });

    // Sempre enviar estes campos
    projectData.id = document.getElementById("id").value || null;
    projectData.folder_name = document.getElementById("folder_name").value || "";
    projectData.path = document.getElementById("path").value || "";
    projectData.llm_config = await getLlmConfigPayload();

    const res = await fetch("/projects/generate_readme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });

    const data = await res.json();
    hideLoadingModal();

    const content = data.content || "Sem conteúdo retornado.";
    document.getElementById("readmeDiffContainer").style.display = "none";
    document.getElementById("readmeResultContainer").style.display = "block";
    document.getElementById("readmeOutput").value = content;

    const html = marked.parse(content);
    document.getElementById("readmePreview").innerHTML = html;

  } catch (err) {
    console.error("Erro ao gerar README:", err);
    hideLoadingModal();
    alert("Falha ao gerar o README.");
  }
}


// trocar entre abas Markdown / Preview
// function openReadmeTab(event, tabId) {
//   const tabs = document.querySelectorAll(".readme-tab");
//   const buttons = document.querySelectorAll(".readme-tabs .tab-btn");

//   tabs.forEach((tab) => tab.classList.remove("active"));
//   buttons.forEach((btn) => btn.classList.remove("active"));

//   document.getElementById(tabId).classList.add("active");
//   event.currentTarget.classList.add("active");
// }
function openReadmeTab(event, tabId) {
  const container = event.target.closest("#readmeResultContainer");

  container.querySelectorAll(".readme-tab")
    .forEach(tab => tab.classList.remove("active"));

  container.querySelectorAll(".readme-tabs .tab-btn")
    .forEach(btn => btn.classList.remove("active"));

  container.querySelector(`#${tabId}`).classList.add("active");
  event.currentTarget.classList.add("active");

  // 🔥 renderiza preview sempre que troca
  renderPreviewFromTextarea(tabId, container);
}


// renderiza Markdown para HTML (com fallback seguro)
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// let renderedHtml = "";
// if (typeof marked !== "undefined" && typeof marked.parse === "function") {
//   renderedHtml = marked.parse(content);
// } else {
//   renderedHtml =
//     "<pre style='white-space:pre-wrap; padding:10px;'>" +
//     "Markdown renderer (marked) não carregado.\n\n" +
//     escapeHtml(content) +
//     "</pre>";
// }
// document.getElementById("readmePreview").innerHTML = renderedHtml;



// update README

async function checkGithubReadmeStatus(folderName) {
  try {
    const llmConfig = await getLlmConfigPayload();
    const res = await fetch(`/projects/${folderName}/check_github_readme`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ github_token: llmConfig.github_token }),
    });
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById("has_readme").value = data.has_readme ? "true" : "false";
  } catch (err) {
    console.error("Erro ao verificar README no GitHub:", err);
  } finally {
    updateReadmeButtonsState();
  }
}

function updateReadmeButtonsState() {
  const hasReadme = document.getElementById("has_readme").value.trim().toLowerCase();
  const createBtn = document.getElementById("createReadmeBtn");
  const updateBtn = document.getElementById("updateReadmeBtn");
  const msg = document.getElementById("readmeStatusMessage");

  if (hasReadme === "yes" || hasReadme === "sim" || hasReadme === "true") {
    // Já existe README
    updateBtn.classList.remove("btn-disabled");
    updateBtn.disabled = false;

    createBtn.classList.add("btn-small");
    createBtn.disabled = false; // continua clicável

    // msg.textContent = "Este projeto já possui um README.";
    msg.textContent = "This project already has a README.";

  } else {
    // Não existe README
    updateBtn.classList.add("btn-disabled");
    updateBtn.disabled = true;

    createBtn.classList.remove("btn-small");
    createBtn.disabled = false;

    // msg.textContent = "Nenhum README encontrado neste projeto.";
    msg.textContent = "No README found in this project.";
  }
}

function onCreateReadmeClick() {
  const hasReadme = document.getElementById("has_readme").value.trim().toLowerCase();

  // se já existe, pedir confirmação
  if (hasReadme === "yes" || hasReadme === "sim" || hasReadme === "true") {
    if (!confirm("Um README já existe. Deseja sobrescrever ou criar outro?")) {
      return;
    }
  }

  openReadmeModal(); // sua função atual
}

// function onUpdateReadmeClick() {
//   const updateBtn = document.getElementById("updateReadmeBtn");
//   if (updateBtn.disabled) return;

//   // aqui você chama seu backend de update (quando implementar)
//   alert("Aqui chamará o update de README existente.");
// }
function showUpdateReadmeModal() {
  document.getElementById("updateReadmeModal").style.display = "block";
}

function onUpdateReadmeClick() {
  const updateBtn = document.getElementById("updateReadmeBtn");
  if (updateBtn.disabled) return;

  // document.getElementById("updateReadmeModal").style.display = "block";
  showUpdateReadmeModal()
}

function closeUpdateReadmeModal() {
  document.getElementById("updateReadmeModal").style.display = "none";
}

async function submitUpdateReadme() {
  // ===============================
  // COMMITS OPTIONS (INDIVIDUAL)
  // ===============================
  let commitOptions = [];

  const useTitleDescription = document.querySelector(
    ".commit-option[value='title_description']"
  )?.checked;

  const useDiffs = document.querySelector(
    ".commit-option[value='diffs']"
  )?.checked;

  if (useTitleDescription) {
    commitOptions.push("title_description");
  }

  if (useDiffs) {
    commitOptions.push("diffs");
  }

  // ===============================
  // COMMIT RANGE
  // ===============================
  const rangeTypeEl = document.querySelector(
    "input[name='range_type']:checked"
  );
  const rangeType = rangeTypeEl ? rangeTypeEl.value : null;

  let startDate = null;
  let endDate = null;

  if (rangeType === "date_range") {
    startDate = document.getElementById("start_date").value || null;
    endDate = document.getElementById("end_date").value || null;
  }

  // ===============================
  // OTHER RESOURCES (SEMPRE NO PAYLOAD)
  // ===============================
  const useName = document.getElementById("use_name").checked;
  const useDescription = document.getElementById("use_description").checked;
  const useLanguage = document.getElementById("use_language").checked;
  const useFramework = document.getElementById("use_framework").checked;
  const useDependenceFile = document.getElementById("dependency_files").checked;

  const name = useName
    ? document.getElementById("name").value || null
    : null;

  const description = useDescription
    ? document.getElementById("description").value || null
    : null;

  const language = useLanguage
    ? document.getElementById("language").value || null
    : null;

  const framework = useFramework
    ? document.getElementById("framework").value || null
    : null;

  const dependence_file_name = useDependenceFile
    ? document.getElementById("dependence_file_name").value || null
    : null;

  // ===============================
  // PROJECT INFO
  // ===============================
  const folderName = document.getElementById("folder_name").value || null;
  const path = document.getElementById("path").value || null;

  // ===============================
  // PAYLOAD FINAL
  // ===============================
  const payload = {
    folder_name: folderName,
    path: path,

    commit_options: commitOptions,
    range_type: rangeType,
    start_date: startDate,
    end_date: endDate,

    name: name,
    description: description,
    language: language,
    framework: framework,
    dependence_file_name: dependence_file_name,
    llm_config: await getLlmConfigPayload(),
  };

  console.log("UPDATE README PAYLOAD:", payload);

  // ===============================
  // UI
  // ===============================
  closeUpdateReadmeModal();
  showLoadingModal();

  try {
    const response = await fetch("/projects/update_readme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      alert("Erro ao atualizar README: " + (data.error || "Erro desconhecido"));
      hideLoadingModal();
      showUpdateReadmeModal();
      return;
    }

    // ===============================
    // COMPARAÇÃO DE README
    // ===============================
    document.getElementById("readmeResultContainer").style.display = "none";
    document.getElementById("readmeDiffContainer").style.display = "block";

    const oldReadme = data.content?.old_readme || "";
    const newReadme = data.content?.updated_readme || "";

    document.getElementById("oldReadmeOutput").value = oldReadme;
    document.getElementById("newReadmeOutput").value = newReadme;

    document.getElementById("oldReadmePreview").innerHTML = marked.parse(oldReadme);
    document.getElementById("newReadmePreview").innerHTML = marked.parse(newReadme);

  } catch (err) {
    console.error("Erro no update README:", err);
    alert("Erro na requisição. Veja o console.");
  } finally {
    hideLoadingModal();
  }
}


// function openDualTab(event, tabId) {
//   const parent = event.target.closest(".diff-col");

//   parent.querySelectorAll(".dual-tab").forEach(t => t.classList.remove("active"));
//   parent.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));

//   parent.querySelector(`#${tabId}`).classList.add("active");
//   event.target.classList.add("active");
// }
function openDualTab(event, tabId) {
  const parent = event.target.closest(".diff-col");

  parent.querySelectorAll(".dual-tab")
    .forEach(t => t.classList.remove("active"));

  parent.querySelectorAll(".tab-btn")
    .forEach(b => b.classList.remove("active"));

  parent.querySelector(`#${tabId}`).classList.add("active");
  event.target.classList.add("active");

  // 🔥 atualiza preview dinamicamente
  renderPreviewFromTextarea(tabId, parent);
}

function renderPreviewFromTextarea(tabId, container) {
  // só renderiza se for preview
  if (!tabId.toLowerCase().includes("preview")) return;

  let textarea, preview;

  if (tabId === "previewTab") {
    textarea = container.querySelector("#readmeOutput");
    preview = container.querySelector("#readmePreview");
  }

  if (tabId === "oldPreviewTab") {
    textarea = container.querySelector("#oldReadmeOutput");
    preview = container.querySelector("#oldReadmePreview");
  }

  if (tabId === "newPreviewTab") {
    textarea = container.querySelector("#newReadmeOutput");
    preview = container.querySelector("#newReadmePreview");
  }

  if (!textarea || !preview) return;

  preview.innerHTML = marked.parse(textarea.value || "");
}



// download

function downloadReadme(type) {
  const text = document.getElementById(type).value;

  const fileName = type === "oldReadmeOutput"
    ? "OLD_README.md"
    : type === "readmeOutput"
      ? "CREATED_README.md"
      : "UPDATED_README.md";


  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// confirm save readme


function openConfirmSaveModal(targetId) {
  readmeTarget = targetId;

  document.getElementById("saveStep").style.display = "block";
  document.getElementById("commitStep").style.display = "none";

  const isGithub = document.getElementById("project_source").value === "github";
  if (isGithub) {
    const commitTitleEl = document.getElementById("commitTitle");
    const commitMessageEl = document.getElementById("commitMessage");
    if (commitTitleEl) commitTitleEl.value = "";
    if (commitMessageEl) commitMessageEl.value = "";
  }

  const ghBanner = document.getElementById("githubApplyReadmeTokenBanner");
  if (ghBanner) {
    ghBanner.style.display = isGithub ? "block" : "none";
  }

  document.getElementById("confirmSaveModal").style.display = "flex";
}

function closeConfirmSaveModal() {
  document.getElementById("confirmSaveModal").style.display = "none";
  const ghBanner = document.getElementById("githubApplyReadmeTokenBanner");
  if (ghBanner) ghBanner.style.display = "none";
}

async function applyReadmeOverwrite() {
  const content = document.getElementById(readmeTarget).value;
  const folderName = document.getElementById("folder_name").value;
  const path = document.getElementById("path").value;
  const source = document.getElementById("project_source").value;

  // GitHub: skip local write, go straight to commit step with commit message
  if (source === "github") {
    pendingReadmeContent = content;
    document.getElementById("saveStep").style.display = "none";
    document.getElementById("commitStep").style.display = "block";
    return;
  }

  console.log(content)
  const payload = {
    folder_name: folderName,
    readme_content: content,
    path
  };

  try {
    showLoadingModal()
    const response = await fetch("/projects/apply_readme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      alert("Erro ao salvar README: " + (data.error || ""));
      return;
    }

    // TROCA PARA A TELA DE COMMIT
    document.getElementById("saveStep").style.display = "none";
    document.getElementById("commitStep").style.display = "block";
    hideLoadingModal()

  } catch (err) {
    console.error(err);
    alert("Erro de requisição ao salvar README");
  }
}

async function submitCommit() {
  const msg = document.getElementById("commitMessage").value;
  const folderName = document.getElementById("folder_name").value;
  const title = document.getElementById("commitTitle").value;
  const path = document.getElementById("path").value;
  const source = document.getElementById("project_source").value;

  if (!msg.trim()) {
    alert("Escreva uma mensagem para o commit.");
    return;
  }

  // GitHub: write README via GitHub API (commit message required by GitHub Contents API)
  if (source === "github") {
    try {
      const llmConfig = await getLlmConfigPayload();
      const payload = {
        folder_name: folderName,
        readme_content: pendingReadmeContent,
        commit_message: msg,
        commit_title: title,
        llm_config: llmConfig,
      };
      const response = await fetch("/projects/apply_readme_github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        alert("Erro ao aplicar README no GitHub: " + (data.error || "Erro desconhecido"));
        return;
      }
      closeConfirmSaveModal();
      openCommitConfirmModal();
    } catch (err) {
      console.error(err);
      alert("Erro de requisição ao aplicar README no GitHub.");
    }
    return;
  }

  // Local: existing behavior
  const payload = {
    folder_name: folderName,
    commit_message: msg,
    commit_title: title,
    path,
  };

  console.log("COMMIT PAYLOAD:", payload);

  try {
    const response = await fetch("/projects/git_commit_readme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      alert("Erro ao commitar: " + (data.error || ""));
      return;
    }

    // salvar a hash globalmente
    if (data.commit_hash) {
      lastCommitHash = data.commit_hash;
      console.log("HASH DO COMMIT:", lastCommitHash);
    }


    // alert("Commit realizado com sucesso!");
    // closeConfirmSaveModal();
    alert("Commit realizado com sucesso!");

    // fecha modal de commit
    closeConfirmSaveModal();

    // abre modal de confirmação
    openCommitConfirmModal();


  } catch (err) {
    console.error(err);
    alert("Erro de requisição ao commitar.");
  }
}


//  confirm commit :
// === MODAL DE CONFIRMAÇÃO DO COMMIT ===

function openCommitConfirmModal() {
  document.getElementById("commitConfirmModal").style.display = "flex";
}

function closeCommitConfirmModal() {
  document.getElementById("commitConfirmModal").style.display = "none";
}

// === DESFAZER COMMIT ===

async function undoCommit() {
  const folderName = document.getElementById("folder_name").value;
  const path = document.getElementById("path").value;

  if (!folderName) {
    alert("Nenhum projeto carregado.");
    return;
  }

  try {
    showLoadingModal();

    const res = await fetch("/projects/undo_commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // body: JSON.stringify({ folder_name: folderName, path })
      body: JSON.stringify({ folder_name: folderName, path, commit_hash: lastCommitHash })

    });

    const data = await res.json();

    hideLoadingModal();

    if (!res.ok) {
      alert("Erro ao desfazer commit: " + (data.error || ""));
      return;
    }

    alert("Commit desfeito!");

    closeCommitConfirmModal();

    // reabre tela de commit
    // openConfirmSaveModal("newReadmeOutput");

  } catch (err) {
    hideLoadingModal();
    console.error(err);
    alert("Falha ao tentar desfazer commit.");
  }
}

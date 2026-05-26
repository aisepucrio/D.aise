let allPrompts = {};
let defaultPrompts = {};

let currentFilter = "all";

let selectedPromptId = null;

let pendingDefaultChange = null;

let promptGroupsState = {
    analyze_project: true,
    create_readme: true,
    update_readme: true,
};

const PROMPT_VARIABLES = {
    analyze_project: [
        "{{tree}}"
    ],
    create_readme: [
        "{{name}}",
        "{{folder_name}}",
        "{{description}}",
        "{{language}}",
        "{{framework}}",
        "{{dependence_file_content}}",
        "{{tree}}",
        "{{commits}}"
    ],
    update_readme: [
        "{{readme_content}}",
        "{{name}}",
        "{{description}}",
        "{{language}}",
        "{{framework}}",
        "{{tree}}",
        "{{commits}}",
        "{{dependence_file_name}}",
    ]
};


// ===== Inicialização =====
document.addEventListener("DOMContentLoaded", () => {
    // alert("Página de prompts carregada");
    loadPrompts();
});

// ===== Funções principais =====
function loadPrompts() {
    fetch("/prompts/get_all", {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    })
        .then(async response => {
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load prompts");
            }

            return data;
        })
        .then(result => {
            allPrompts = result.data.prompts;
            defaultPrompts = result.data.defaults || {};

            renderPromptList(allPrompts);
        })
        .catch(error => {
            console.error(error);
            alert("Error loading prompts");
        });

}


function renderPromptList(prompts) {
    const promptList = document.getElementById("prompt-list");
    promptList.innerHTML = "";

    // 1️⃣ Agrupa prompts por tipo
    const grouped = {};

    Object.entries(prompts).forEach(([id, prompt]) => {
        if (!grouped[prompt.type]) {
            grouped[prompt.type] = {};
        }
        grouped[prompt.type][id] = prompt;
    });

    const GROUP_ORDER = [
        "analyze_project",
        "create_readme",
        "update_readme"
    ];

    // 2️⃣ Renderiza cada grupo
    GROUP_ORDER.forEach(type => {
        const groupPrompts = grouped[type];
        if (!groupPrompts) return;
        const groupLi = document.createElement("li");
        groupLi.classList.add("prompt-group");

        // Header do grupo
        const header = document.createElement("div");
        header.classList.add("prompt-group-header");
        header.onclick = () => togglePromptGroup(type);

        header.innerHTML = `
            <span>${formatPromptType(type)}</span>
            <span class="chevron">${promptGroupsState[type] ? "▾" : "▸"}</span>
        `;

        // Lista interna
        const itemsUl = document.createElement("ul");
        itemsUl.classList.add("prompt-group-items");
        itemsUl.dataset.type = type;

        if (!promptGroupsState[type]) {
            itemsUl.style.display = "none";
        }

        // Prompts do grupo
        Object.entries(groupPrompts).forEach(([id, prompt]) => {
            const li = document.createElement("li");
            li.classList.add("prompt-item");

            if (!prompt.is_active) {
                li.style.opacity = "0.5";
            }

            li.dataset.id = id;
            li.onclick = () => selectPrompt(id);

            if (id === selectedPromptId) {
                li.classList.add("active");
            }


            // li.innerHTML = `
            //     <span class="prompt-name">${prompt.name}</span>
            // `;
            const isDefault = defaultPrompts[prompt.type] === id;
            li.innerHTML = `
                <div class="prompt-actions-left">
                    <span
                        class="prompt-duplicate"
                        title="Duplicate prompt"
                        onclick="duplicatePromptFromList(event, '${id}')"
                    >
                        ⧉
                    </span>

                    <span
                        class="prompt-delete-x"
                        title="Delete prompt"
                        onclick="deletePromptFromList(event, '${id}')"
                    >
                        <span class="x-line"></span>
                        <span class="x-line"></span>
                    </span>
                </div>

                <span class="prompt-name"  title="select prompt">${prompt.name}</span>

                <div class="prompt-actions-right">
                    <span
                        class="prompt-star ${isDefault ? "active" : ""}"
                        title="Set as default"
                        onclick="setDefaultPrompt(event, '${prompt.type}', '${id}')"
                    >
                        ${isDefault ? "★" : "☆"}
                    </span>
                </div>
            `;





            itemsUl.appendChild(li);
        });

        groupLi.appendChild(header);
        groupLi.appendChild(itemsUl);
        promptList.appendChild(groupLi);
    });
}

function togglePromptGroup(type) {
    promptGroupsState[type] = !promptGroupsState[type];
    renderPromptList(getFilteredPrompts());
}


function formatPromptType(type) {
    const map = {
        analyze_project: "Analyze Project",
        create_readme: "Create README",
        update_readme: "Update README",
    };
    return map[type] || type;
}


function filterPrompts() {
    currentFilter = document.getElementById("prompt-filter").value;
    renderPromptList(getFilteredPrompts());
}

function getFilteredPrompts() {
    if (currentFilter === "all") {
        return allPrompts;
    }

    const filtered = {};

    Object.entries(allPrompts).forEach(([id, prompt]) => {
        if (prompt.type === currentFilter) {
            filtered[id] = prompt;
        }
    });

    return filtered;
}


function selectPrompt(promptId) {
    selectedPromptId = promptId;

    const prompt = allPrompts[promptId];
    if (!prompt) return;

    // ===== Marca item ativo na lista =====
    document.querySelectorAll(".prompt-item").forEach(item => {
        item.classList.remove("active");
    });

    const clickedItem = document.querySelector(
        `.prompt-item[data-id="${promptId}"]`
    );

    if (clickedItem) {
        clickedItem.classList.add("active");
    }


    // ===== Preenche formulário =====
    document.getElementById("prompt-id").value = prompt.id;
    document.getElementById("prompt-name").value = prompt.name;
    document.getElementById("prompt-type").value = prompt.type;
    document.getElementById("prompt-description").value = prompt.description || "";
    document.getElementById("prompt-content").value = prompt.content;
    document.getElementById("prompt-active").checked = !!prompt.is_active;


    // ===== Ajusta UI =====
    document.getElementById("delete-prompt-btn").style.visibility = "visible";
    document.getElementById("form-title").innerText = "Edit prompt";
    document.querySelector(".content-footer .primary").innerText = "Save changes";

    // ===== Mostrar ID abaixo do título =====
    const idDisplay = document.getElementById("prompt-id-display");
    idDisplay.innerText = `ID: ${prompt.id}`;
    idDisplay.classList.remove("hidden");

    // ===== Atualiza variáveis do prompt selecionado =====
    renderPromptVariables();
    validatePromptVariables();


}

function openCreateNewPrompt() {
    // ===== Remove seleção da lista =====
    document.querySelectorAll(".prompt-item").forEach(item => {
        item.classList.remove("active");
    });

    // ===== Limpa formulário =====
    document.getElementById("prompt-id").value = "";
    document.getElementById("prompt-name").value = "";
    document.getElementById("prompt-type").value = "";
    document.getElementById("prompt-description").value = "";
    document.getElementById("prompt-content").value = "";
    document.getElementById("prompt-active").checked = true;

    // ===== Ajusta UI para modo criação =====
    document.getElementById("form-title").innerText = "Create new prompt";
    document.querySelector(".content-footer .primary").innerText = "Save";
    document.getElementById("delete-prompt-btn").style.visibility = "hidden";

    // ===== Esconde ID no modo criação =====
    const idDisplay = document.getElementById("prompt-id-display");
    idDisplay.innerText = "";
    idDisplay.classList.add("hidden");

    // ===== Reset UI de variáveis =====
    document.getElementById("prompt-variables-list").innerHTML = "";

    // ===== Reabilita botão salvar =====
    document.querySelector(".content-footer .primary").disabled = false;


}


function savePrompt() {
    console.log("funcao chamada")
    const id = document.getElementById("prompt-id")?.value || null;
    const name = document.getElementById("prompt-name").value.trim();
    const type = document.getElementById("prompt-type").value;
    const description = document.getElementById("prompt-description").value.trim();
    const content = document.getElementById("prompt-content").value.trim();
    const isActive = document.getElementById("prompt-active").checked;

    // Validação mínima
    if (!name || !type || !content) {
        alert("Name, type and content are required");
        return;
    }

    const now = new Date().toISOString();

    const promptData = {
        id: id, // backend pode ignorar ou gerar se null
        name: name,
        type: type,
        description: description,
        content: content,
        is_active: isActive,
        created_at: id ? undefined : now,
        updated_at: now
    };

    fetch("/prompts/create_prompt", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(promptData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to save prompt");
            }
            return response.json();
        })
        .then(data => {
            alert("Prompt saved successfully");

            const savedPrompt = data.data;

            // 🔑 ISSO É O PONTO-CHAVE
            allPrompts[savedPrompt.id] = savedPrompt;

            // agora funciona
            selectPrompt(savedPrompt.id);

            renderPromptList(allPrompts);
        })
        .catch(error => {
            console.error(error);
            alert("Error saving prompt");
        });
}

function duplicatePromptFromList(event, promptId) {
    event.stopPropagation();

    const original = allPrompts[promptId];
    if (!original) return;

    const now = new Date().toISOString();

    const duplicatedPrompt = {
        // id NÃO vai
        name: `${original.name} - copy`,
        type: original.type,
        description: original.description || "",
        content: original.content,
        is_active: original.is_active,
        created_at: now,
        updated_at: now
    };

    fetch("/prompts/create_prompt", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(duplicatedPrompt)
    })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to duplicate prompt");
            }
            return data;
        })
        .then(data => {
            const savedPrompt = data.data;

            // adiciona localmente
            allPrompts[savedPrompt.id] = savedPrompt;

            // atualiza UI
            renderPromptList(getFilteredPrompts());

            // seleciona o novo prompt
            selectPrompt(savedPrompt.id);
        })
        .catch(error => {
            console.error(error);
            alert("Error duplicating prompt");
        });
}


function setDefaultPrompt(event, type, promptId) {
    event.stopPropagation();

    // 1️⃣ Já é default → não faz nada
    if (defaultPrompts[type] === promptId) {
        return;
    }

    // 2️⃣ Guarda intenção
    pendingDefaultChange = { type, promptId };

    // 3️⃣ Texto do modal
    const promptName = allPrompts[promptId]?.name || "this prompt";
    const typeLabel = formatPromptType(type);

    document.getElementById("default-confirm-text").innerText =
        `"${promptName}" will become the default prompt for "${typeLabel}".`;

    // 4️⃣ Abre modal
    document.getElementById("default-confirm-modal").classList.remove("hidden");
}

function confirmSetDefault() {
    if (!pendingDefaultChange) return;

    const { type, promptId } = pendingDefaultChange;

    fetch("/prompts/set_default", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            type: type,
            prompt_id: promptId
        })
    })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to set default");
            }
            return data;
        })
        .then(() => {
            defaultPrompts[type] = promptId;
            renderPromptList(allPrompts);
            closeDefaultModal();
        })
        .catch(error => {
            console.error(error);
            alert("Error setting default prompt");
            closeDefaultModal();
        });
}

function closeDefaultModal() {
    pendingDefaultChange = null;
    document.getElementById("default-confirm-modal").classList.add("hidden");
}


function deletePrompt() {
    if (!selectedPromptId) {
        alert("No prompt selected");
        return;
    }

    const promptName = allPrompts[selectedPromptId]?.name || "this prompt";

    const confirmed = confirm(
        `Are you sure you want to delete "${promptName}"?\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    fetch(`/prompts/delete/${selectedPromptId}`, {
        method: "DELETE",
        headers: {
            "Accept": "application/json"
        }
    })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to delete prompt");
            }
            return data;
        })
        .then(() => {
            alert("Prompt deleted successfully");

            // limpa estado
            selectedPromptId = null;

            // limpa formulário
            openCreateNewPrompt();

            // recarrega prompts
            loadPrompts();
        })
        .catch(error => {
            console.error(error);
            alert("Error deleting prompt");
        });
}


function deletePromptFromList(event, promptId) {
    event.stopPropagation(); // impede selecionar o prompt

    // reaproveita a lógica existente
    selectedPromptId = promptId;
    deletePrompt();
}



// ===== Eventos auxiliares =====

function searchPrompts() {
    alert("searchPrompts() chamado");
    // filtro local ou fetch com query
}

function onPromptFieldChange() {
    console.log("Campo do prompt alterado");
    validatePromptVariables();
    // útil depois para auto-save ou dirty state
}

function onPromptDefaultChange() {
    alert("onPromptDefaultChange() chamado");
    // valida regra de 1 padrão por finalidade
}

//    -----------prompt variables UI -----------

function onPromptTypeChange() {
    renderPromptVariables();
    validatePromptVariables();
}

function onPromptContentChange() {
    validatePromptVariables();
}


function renderPromptVariables() {
    const type = document.getElementById("prompt-type").value;
    const list = document.getElementById("prompt-variables-list");

    list.innerHTML = "";

    if (!PROMPT_VARIABLES[type]) return;

    PROMPT_VARIABLES[type].forEach(variable => {
        const li = document.createElement("li");
        li.classList.add("prompt-variable");
        li.dataset.variable = variable;

        li.innerHTML = `
            <span class="check">✖</span>
            <span>${variable}</span>
        `;

        list.appendChild(li);
    });

    validatePromptVariables();
}


function validatePromptVariables() {
    const content = document.getElementById("prompt-content").value;
    const variables = document.querySelectorAll(".prompt-variable");

    let allValid = true;

    variables.forEach(item => {
        const variable = item.dataset.variable;
        const check = item.querySelector(".check");

        if (content.includes(variable)) {
            item.classList.add("ok");
            check.innerText = "✔";
        } else {
            item.classList.remove("ok");
            check.innerText = "✖";
            allValid = false;
        }
    });

    // bloqueia botão salvar
    document.querySelector(".content-footer .primary").disabled = !allValid;
}

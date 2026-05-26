/**
 * Configuração LLM
 *
 * Persistência: servidor via GET/POST /models/api/llm-config
 * (gravado em data/config/llm_config.json)
 *
 * Dois níveis de estado:
 *   - Credenciais (apiKey/endpoint): por provedor, persistidas ao clicar "+".
 *   - Última config salva (__lastSavedConfig): provider + model + temp + tokens,
 *     persistida ao clicar "Salvar configurações".
 *
 * Ao trocar de provedor sem salvar:
 *   - Se voltar para o provedor salvo → restaura a última config salva.
 *   - Se for para outro provedor → campos model/temp/tokens em branco.
 * Credenciais comprometidas sempre persistem por provedor.
 */
(function () {
  const API_URL = "/models/api/llm-config";
  const MODELS_URL = "/models/api/models";
  const MSG_MS = 3000;

  // Catálogo de modelos por provedor (carregado do servidor na inicialização)
  let availableModels = { gemini: [], openai: [], ollama: [] };

  const defaultProviderCred = () => ({
    apiKey: "",
    committedApiKey: "",
    endpoint: "",
    committedEndpoint: "",
  });

  const defaultLastSavedConfig = () => ({
    provider: "gemini",
    model: "",
    temperature: 0,
    tokens: "0",
  });

  let state = {
    gemini: defaultProviderCred(),
    openai: defaultProviderCred(),
    ollama: defaultProviderCred(),
    lastSavedConfig: defaultLastSavedConfig(),
    _loaded: false,
  };

  let msgTimerApi = null;
  let msgTimerOllama = null;

  const el = {
    form: null,
    provider: null,
    panelApi: null,
    panelOllama: null,
    apiKeyInput: null,
    ollamaEndpointInput: null,
    btnCredentialApi: null,
    btnCredentialOllama: null,
    msgApi: null,
    msgOllama: null,
    model: null,
    temperature: null,
    tokens: null,
    credentialDynamic: null,
  };

  // ============================================================
  // API (servidor)
  // ============================================================

  async function loadStateFromServer() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      ["gemini", "openai", "ollama"].forEach((p) => {
        if (!data[p]) return;
        const src = data[p];
        const base = defaultProviderCred();

        if (p === "gemini" || p === "openai") {
          base.apiKey = String(src.committedApiKey || src.apiKey || "");
          base.committedApiKey = String(src.committedApiKey || base.apiKey);
        }
        if (p === "ollama") {
          base.endpoint = String(src.committedEndpoint || src.endpoint || "");
          base.committedEndpoint = String(src.committedEndpoint || base.endpoint);
        }
        state[p] = base;
      });

      if (data.__lastSavedConfig) {
        const lsc = data.__lastSavedConfig;
        const provider = String(lsc.provider || "gemini").toLowerCase();
        state.lastSavedConfig = {
          provider: ["gemini", "openai", "ollama"].includes(provider) ? provider : "gemini",
          model: String(lsc.model || ""),
          temperature: clampTemp(Number(lsc.temperature) || 0),
          tokens: normalizeTokens(lsc.tokens),
        };
      }

      state._loaded = true;
    } catch (e) {
      console.warn("configModels: falha ao carregar config do servidor", e);
      state._loaded = true;
    }
  }

  async function saveCredentialToServer(kind, provider) {
    const payload = {};
    if (kind === "api") {
      payload[provider] = {
        apiKey: state[provider].apiKey,
        committedApiKey: state[provider].committedApiKey,
      };
    } else {
      payload.ollama = {
        endpoint: state.ollama.endpoint,
        committedEndpoint: state.ollama.committedEndpoint,
      };
    }
    await _postConfig(payload);
  }

  async function saveLastConfigToServer() {
    await _postConfig({ __lastSavedConfig: state.lastSavedConfig });
  }

  async function loadModelsFromServer() {
    try {
      const res = await fetch(MODELS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      availableModels = await res.json();
    } catch (e) {
      console.warn("configModels: falha ao carregar models.json do servidor", e);
    }
  }

  async function _postConfig(payload) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn("configModels: erro ao gravar config:", err);
      }
    } catch (e) {
      console.warn("configModels: falha na requisição de salvar config", e);
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function getCurrentProvider() {
    return el.provider ? el.provider.value || "gemini" : "gemini";
  }

  function isApiProvider(p) {
    return p === "gemini" || p === "openai";
  }

  function getApiPlaceholder(provider) {
    if (provider === "openai") return "Insira sua chave da API da OpenAI (sk-...)";
    return "Insira sua chave da API do Gemini";
  }

  /**
   * Popula o <select> de modelo com as opções do provedor dado.
   * @param {string} provider
   * @param {string} [selectedValue] valor a pré-selecionar (modelo salvo)
   */
  function populateModelSelect(provider, selectedValue = "") {
    if (!el.model) return;
    const options = availableModels[provider] || [];

    el.model.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.textContent = "Selecione um modelo";
    el.model.appendChild(placeholder);

    options.forEach(({ value, label }) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      el.model.appendChild(opt);
    });

    // Pré-seleciona o modelo salvo, se existir entre as opções
    const exists = options.some((o) => o.value === selectedValue);
    el.model.value = exists ? selectedValue : "";
    if (!exists) placeholder.selected = true;
  }

  function getModelPlaceholder(provider) {
    if (provider === "openai") {
      return "Ex: gpt-4o, gpt-4-turbo, gpt-3.5";
    }
    if (provider === "ollama") {
      return "Ex: llama3:8b, mistral:7b, gemma3:4b";
    }
    return "Ex: gemini-1.5-pro, gemini-1.5-flash, gemini-2.5-flash";
  }

  function updateApiPlaceholder(provider) {
    if (!el.apiKeyInput) return;
    el.apiKeyInput.placeholder = getApiPlaceholder(provider);
  }

  function updateModelPlaceholder(provider) {
    if (!el.model) return;
    el.model.placeholder = getModelPlaceholder(provider);
  }

  function clampTemp(v) {
    const n = Math.round(v * 10) / 10;
    if (Number.isNaN(n)) return 0;
    return Math.min(1.0, Math.max(0, n));
  }

  function normalizeTokens(v) {
    const asText = v !== undefined && v !== null ? String(v).trim() : "";
    return asText === "" ? "0" : asText;
  }

  function updateTokensVisual() {
    if (!el.tokens) return;
    const isDefault = (el.tokens.value || "").trim() === "0";
    el.tokens.classList.toggle("token-default", isDefault);
  }

  /** Remove bordas de erro de validação (ex.: ao trocar de provedor). */
  function clearValidationErrorStyles() {
    if (!el.apiKeyInput) return;
    el.apiKeyInput.classList.remove("config-llm-input--error");
    el.ollamaEndpointInput.classList.remove("config-llm-input--error");
    el.model.classList.remove("config-llm-input--error");
    el.temperature.classList.remove("config-llm-input--error");
    el.tokens.classList.remove("config-llm-input--error");
  }

  // ============================================================
  // LER / ESCREVER FORMULÁRIO
  // ============================================================

  function readCredentialsIntoState(provider) {
    if (isApiProvider(provider)) {
      state[provider].apiKey = el.apiKeyInput.value;
    } else {
      state.ollama.endpoint = el.ollamaEndpointInput.value;
    }
  }

  /**
   * Chamado UMA VEZ na abertura da tela após carregar do servidor.
   * Pré-preenche tudo com a última config salva + credenciais comprometidas.
   */
  function initFormFromState() {
    const lsc = state.lastSavedConfig;
    const provider = lsc.provider;

    el.provider.value = provider;
    setPanelsVisibility(isApiProvider(provider));
    updateApiPlaceholder(provider);
    updateModelPlaceholder(provider);

    if (isApiProvider(provider)) {
      const s = state[provider];
      el.apiKeyInput.value = s.committedApiKey || s.apiKey || "";
    } else {
      const s = state.ollama;
      el.ollamaEndpointInput.value = s.committedEndpoint || s.endpoint || "";
    }

    populateModelSelect(provider, lsc.model || "");
    el.temperature.value = String(lsc.temperature);
    el.tokens.value = normalizeTokens(lsc.tokens);
    updateTokensVisual();

    updateCredentialUI("api");
    updateCredentialUI("ollama");
  }

  /**
   * Chamado ao trocar de provedor.
   * Restaura credenciais do novo provedor.
   * Model/temp/tokens: restaurados se for o provedor da última config salva;
   * limpos caso contrário.
   */
  function writeCredentialsToForm(provider) {
    if (isApiProvider(provider)) {
      const s = state[provider];
      el.apiKeyInput.value = s.committedApiKey || s.apiKey || "";
    } else {
      const s = state.ollama;
      el.ollamaEndpointInput.value = s.committedEndpoint || s.endpoint || "";
    }

    const lsc = state.lastSavedConfig;
    if (provider === lsc.provider) {
      populateModelSelect(provider, lsc.model || "");
      el.temperature.value = String(lsc.temperature);
      el.tokens.value = normalizeTokens(lsc.tokens);
    } else {
      populateModelSelect(provider, "");
      el.temperature.value = "0";
      el.tokens.value = "0";
    }
    updateTokensVisual();

    updateCredentialUI("api");
    updateCredentialUI("ollama");
  }

  // ============================================================
  // CREDENTIAL UI (botão + / check)
  // ============================================================

  function updateCredentialUI(kind) {
    const p = getCurrentProvider();
    if (kind === "api" && !isApiProvider(p)) return;
    if (kind === "ollama" && p !== "ollama") return;

    const isApi = kind === "api";
    const s = isApi ? state[p] : state.ollama;

    const input = isApi ? el.apiKeyInput : el.ollamaEndpointInput;
    const btn = isApi ? el.btnCredentialApi : el.btnCredentialOllama;
    const innerPlus = btn.querySelector(".btn-credential-inner--plus");
    const innerCheck = btn.querySelector(".btn-credential-inner--check");

    const v = (input.value || "").trim();
    const committed = isApi
      ? (s.committedApiKey || "").trim()
      : (s.committedEndpoint || "").trim();

    const isDirty = committed === "" || v !== committed;
    const showCheck = committed !== "" && !isDirty && v !== "";

    if (showCheck) {
      innerPlus.setAttribute("hidden", "");
      innerCheck.removeAttribute("hidden");
      btn.classList.add("btn-credential-action--saved");
      btn.disabled = true;
    } else {
      innerPlus.removeAttribute("hidden");
      innerCheck.setAttribute("hidden", "");
      btn.classList.remove("btn-credential-action--saved");
      btn.disabled = v.length === 0;
    }
  }

  function showSavedMessage(kind) {
    const msg = kind === "api" ? el.msgApi : el.msgOllama;
    if (kind === "api") {
      if (msgTimerApi) clearTimeout(msgTimerApi);
      msg.removeAttribute("hidden");
      msgTimerApi = window.setTimeout(() => {
        msg.setAttribute("hidden", "");
        msgTimerApi = null;
      }, MSG_MS);
    } else {
      if (msgTimerOllama) clearTimeout(msgTimerOllama);
      msg.removeAttribute("hidden");
      msgTimerOllama = window.setTimeout(() => {
        msg.setAttribute("hidden", "");
        msgTimerOllama = null;
      }, MSG_MS);
    }
  }

  async function commitCredential(kind) {
    const p = getCurrentProvider();
    if (kind === "api" && !isApiProvider(p)) return;
    if (kind === "ollama" && p !== "ollama") return;

    const input = kind === "api" ? el.apiKeyInput : el.ollamaEndpointInput;
    const v = (input.value || "").trim();
    if (!v) return;

    if (kind === "api") {
      state[p].apiKey = input.value;
      state[p].committedApiKey = v;
    } else {
      state.ollama.endpoint = input.value;
      state.ollama.committedEndpoint = v;
    }

    await saveCredentialToServer(kind, p);
    showSavedMessage(kind);
    updateCredentialUI("api");
    updateCredentialUI("ollama");
  }

  function onCredentialInput(kind) {
    readCredentialsIntoState(getCurrentProvider());
    updateCredentialUI(kind);
  }

  // ============================================================
  // TROCA DE PROVEDOR
  // ============================================================

  function setPanelsVisibility(showApi) {
    if (showApi) {
      el.panelApi.hidden = false;
      el.panelApi.setAttribute("aria-hidden", "false");
      el.panelOllama.hidden = true;
      el.panelOllama.setAttribute("aria-hidden", "true");
    } else {
      el.panelApi.hidden = true;
      el.panelApi.setAttribute("aria-hidden", "true");
      el.panelOllama.hidden = false;
      el.panelOllama.setAttribute("aria-hidden", "false");
    }
  }

  function switchCredentialPanels(nextProvider, useFade) {
    const showApi = isApiProvider(nextProvider);
    const apply = () => {
      setPanelsVisibility(showApi);
      writeCredentialsToForm(nextProvider);
    };

    if (!useFade) {
      apply();
      return;
    }

    el.credentialDynamic.classList.add("credential-dynamic--fade");
    window.setTimeout(() => {
      apply();
      window.requestAnimationFrame(() => {
        el.credentialDynamic.classList.remove("credential-dynamic--fade");
      });
    }, 180);
  }

  function onProviderChange(prev, next) {
    clearValidationErrorStyles();
    readCredentialsIntoState(prev);
    updateApiPlaceholder(next);
    updateModelPlaceholder(next);

    if (isApiProvider(prev) && isApiProvider(next)) {
      writeCredentialsToForm(next);
      return;
    }

    switchCredentialPanels(next, true);
  }

  // ============================================================
  // INIT
  // ============================================================

  async function init() {
    el.form = document.getElementById("llm-config-form");
    el.provider = document.getElementById("llm-provider");
    el.panelApi = document.getElementById("panel-api");
    el.panelOllama = document.getElementById("panel-ollama");
    el.apiKeyInput = document.getElementById("api-key-input");
    el.ollamaEndpointInput = document.getElementById("ollama-endpoint-input");
    el.btnCredentialApi = document.getElementById("btn-credential-api");
    el.btnCredentialOllama = document.getElementById("btn-credential-ollama");
    el.msgApi = document.getElementById("api-saved-msg");
    el.msgOllama = document.getElementById("ollama-saved-msg");
    el.model = document.getElementById("llm-model");
    el.temperature = document.getElementById("llm-temperature");
    el.tokens = document.getElementById("llm-tokens");
    el.credentialDynamic = document.getElementById("credential-dynamic");

    if (!el.form) return;

    await Promise.all([loadStateFromServer(), loadModelsFromServer()]);
    initFormFromState();

    let prevProvider = getCurrentProvider();

    el.provider.addEventListener("change", () => {
      const next = getCurrentProvider();
      onProviderChange(prevProvider, next);
      prevProvider = next;
    });

    el.apiKeyInput.addEventListener("input", () => onCredentialInput("api"));
    el.apiKeyInput.addEventListener("focus", () => updateCredentialUI("api"));

    el.ollamaEndpointInput.addEventListener("input", () => onCredentialInput("ollama"));
    el.ollamaEndpointInput.addEventListener("focus", () => updateCredentialUI("ollama"));

    el.btnCredentialApi.addEventListener("click", () => commitCredential("api"));
    el.btnCredentialOllama.addEventListener("click", () => commitCredential("ollama"));

    el.temperature.addEventListener("blur", () => {
      el.temperature.value = String(clampTemp(parseFloat(el.temperature.value) || 0));
    });

    el.tokens.addEventListener("focus", () => {
      if ((el.tokens.value || "").trim() === "0") {
        el.tokens.select();
      }
    });
    el.tokens.addEventListener("input", () => updateTokensVisual());
    el.tokens.addEventListener("blur", () => {
      el.tokens.value = normalizeTokens(el.tokens.value);
      updateTokensVisual();
    });

    el.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const provider = getCurrentProvider();
      readCredentialsIntoState(provider);

      // Validação: credencial comprometida
      const credCommitted = isApiProvider(provider)
        ? (state[provider].committedApiKey || "").trim()
        : (state.ollama.committedEndpoint || "").trim();

      const credInput = isApiProvider(provider) ? el.apiKeyInput : el.ollamaEndpointInput;
      const credLabel = isApiProvider(provider) ? "Chave da API" : "URL do Endpoint Ollama";

      // Validação: modelo (select)
      const modelVal = el.model.value;

      const errors = [];

      if (!credCommitted) {
        errors.push(`• ${credLabel}: adicione e confirme com o botão "+".`);
        credInput.classList.add("config-llm-input--error");
      } else {
        credInput.classList.remove("config-llm-input--error");
      }

      if (!modelVal) {
        errors.push("• Modelo: informe o nome do modelo.");
        el.model.classList.add("config-llm-input--error");
      } else {
        el.model.classList.remove("config-llm-input--error");
      }

      if (errors.length > 0) {
        alert("Preencha os campos obrigatórios antes de salvar:\n\n" + errors.join("\n"));
        return;
      }

      state.lastSavedConfig = {
        provider: provider,
        model: modelVal,
        temperature: clampTemp(parseFloat(el.temperature.value) || 0),
        tokens: normalizeTokens(el.tokens.value),
      };

      await saveLastConfigToServer();
      alert("Configurações salvas.");
    });

    // Remove erro visual ao corrigir os campos
    el.apiKeyInput.addEventListener("input", () => el.apiKeyInput.classList.remove("config-llm-input--error"));
    el.ollamaEndpointInput.addEventListener("input", () => el.ollamaEndpointInput.classList.remove("config-llm-input--error"));
    el.model.addEventListener("change", () => el.model.classList.remove("config-llm-input--error"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

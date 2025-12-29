// ===== Providers =====

// 本地（Ollama）主力：剧情最强
const LOCAL_PROVIDER = {
    id: "local",
    label: "Local (Ollama)",
    kind: "local",
    narratorModel: "qwen2.5:14b",
    setupAssistantModel: "qwen2.5:7b",
    summarizerModel: "llama3.1:8b",
    matcherModel: "llama3.1:8b",
    storyModel: "qwen2.5:14b",
    utilityModel: "llama3.1:8b",
    systemModel: "llama3.1:8b"
};

// Gemini（HTTP）
const GEMINI_HTTP_PROVIDER = {
    id: "gemini",
    label: "Gemini 2.0 Flash",
    kind: "gemini",
    apiBase: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    apiKey: "<GEMINI_API_KEY>", // 使用环境变量注入
    narratorModel: "gemini-2.0-flash",
    setupAssistantModel: "gemini-2.0-flash",
    summarizerModel: "gemini-2.0-flash",
    matcherModel: "gemini-2.0-flash",
    storyModel: "gemini-2.0-flash",
    utilityModel: "gemini-2.0-flash",
    systemModel: "gemini-2.0-flash"
};

// Claude（占位，未启用）
const CLAUDE_PROVIDER = {
    id: "claude",
    label: "Claude (HTTP)",
    kind: "http",
    apiBase: "<CLAUDE_API_BASE>",
    apiKey: "<CLAUDE_API_KEY>",
    narratorModel: "<CLAUDE_MODEL>",
    setupAssistantModel: "<CLAUDE_MODEL>",
    summarizerModel: "<CLAUDE_MODEL>",
    matcherModel: "<CLAUDE_MODEL>",
    storyModel: "<CLAUDE_MODEL>",
    utilityModel: "<CLAUDE_MODEL>",
    systemModel: "<CLAUDE_MODEL>"
};

export const AI_PROVIDERS = [
    LOCAL_PROVIDER,
    GEMINI_HTTP_PROVIDER,
    CLAUDE_PROVIDER
];

// ===== Global Config =====

export const AI_CONFIG = {
    // 默认：本地最稳（qwen2.5:14b）
    defaultProvider: LOCAL_PROVIDER.id,

    // Narrator 可选模型（仅影响剧情）
    narratorModel: "qwen2.5:14b",
    narratorModels: ["qwen2.5:14b", "gemini-2.0-flash"],

    // 固定分工（不随下拉切换）
    summarizerModel: "llama3.1:8b",
    matcherModel: "llama3.1:8b",
    setupAssistantModel: "qwen2.5:7b",
    initializerModel: "qwen2.5:7b",

    roleRouting: {
        story:      { defaultProvider: LOCAL_PROVIDER.id,  modelKey: "narratorModel" },
        utility:    { defaultProvider: LOCAL_PROVIDER.id,  modelKey: "utilityModel" },
        system:     { defaultProvider: LOCAL_PROVIDER.id,  modelKey: "systemModel" },
        setup:      { defaultProvider: LOCAL_PROVIDER.id,  modelKey: "setupAssistantModel" },
        initializer:{ defaultProvider: LOCAL_PROVIDER.id,  modelKey: "initializerModel" }
    },

    PRIMARY_STORY_MODEL: "qwen2.5:14b",
    CHEAP_SUMMARIZER_MODEL: "llama3.1:8b",
    ROUTER_MODEL: "llama3.1:8b",
    PHONE_MODEL: "llama3.1:8b",

    storyModel: "qwen2.5:14b",
    memoryModel: "llama3.1:8b",
    phoneModel: "llama3.1:8b",

    systemPrompt: ""
};

// ===== Wallet =====

export const WALLET_DEFAULT = {
    balance: 10000,
    events: []
};
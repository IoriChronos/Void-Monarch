const GROK_PROVIDER = {
    id: "grok",
    label: "Grok",
    kind: "local",
    narratorModel: "qwen2.5:14b",
    setupAssistantModel: "qwen2.5:7b",
    summarizerModel: "llama3.1:8b",
    matcherModel: "llama3.1:8b",
    storyModel: "qwen2.5:14b",
    utilityModel: "local-utility",
    systemModel: "local-system"
};

const CLAUDE_PROVIDER = {
    id: "claude",
    label: "Claude",
    kind: "local",
    narratorModel: "qwen2.5:14b",
    setupAssistantModel: "qwen2.5:7b",
    summarizerModel: "llama3.1:8b",
    matcherModel: "llama3.1:8b",
    storyModel: "qwen2.5:14b",
    utilityModel: "local-utility",
    systemModel: "local-system"
};

const GEMINI_PROVIDER = {
    id: "gemini",
    label: "Gemini",
    kind: "local",
    narratorModel: "qwen2.5:14b",
    setupAssistantModel: "qwen2.5:7b",
    summarizerModel: "llama3.1:8b",
    matcherModel: "llama3.1:8b",
    storyModel: "qwen2.5:14b",
    utilityModel: "local-utility",
    systemModel: "local-system"
};

export const AI_PROVIDERS = [
    GROK_PROVIDER,
    GEMINI_PROVIDER,
    CLAUDE_PROVIDER
];

export const AI_CONFIG = {
    defaultProvider: GROK_PROVIDER.id,
    narratorModel: "qwen2.5:14b",
    narratorModels: ["qwen2.5:14b", "qwen2.5:7b", "llama3.1:8b"],
    summarizerModel: "llama3.1:8b",
    matcherModel: "llama3.1:8b",
    setupAssistantModel: "qwen2.5:7b",
    initializerModel: "qwen2.5:7b",
    roleRouting: {
        story: { defaultProvider: GROK_PROVIDER.id, modelKey: "narratorModel" },
        utility: { defaultProvider: GROK_PROVIDER.id, modelKey: "utilityModel" },
        system: { defaultProvider: GROK_PROVIDER.id, modelKey: "systemModel" },
        setup: { defaultProvider: GROK_PROVIDER.id, modelKey: "setupAssistantModel" },
        initializer: { defaultProvider: GROK_PROVIDER.id, modelKey: "initializerModel" }
    },
    PRIMARY_STORY_MODEL: "qwen2.5:14b",
    CHEAP_SUMMARIZER_MODEL: "llama3.1:8b",
    ROUTER_MODEL: "local-system",
    PHONE_MODEL: "local-utility",
    storyModel: "qwen2.5:14b",
    memoryModel: "llama3.1:8b",
    phoneModel: "local-utility",
    systemPrompt: ""
};

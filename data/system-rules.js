import { appendDynamicToActive, getActiveCard } from "./character-cards.js";

const STORAGE_KEY = "yuan-phone:system-rules";

const defaultRules = {
    persona: "",
    world: "",
    rules: "",
    dynamic: []
};

let systemRules = loadFromStorage();

function loadFromStorage() {
    if (typeof window === "undefined" || !window.localStorage) {
        return structuredClone(defaultRules);
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(defaultRules);
        const parsed = JSON.parse(raw);
        return normalizeRules(parsed);
    } catch {
        return structuredClone(defaultRules);
    }
}

function normalizeRules(rules = {}) {
    return {
        persona: rules.persona || "",
        world: rules.world || "",
        rules: rules.rules || "",
        dynamic: Array.isArray(rules.dynamic) ? rules.dynamic.slice() : []
    };
}

function persist() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(systemRules));
    } catch (err) {
        console.warn("Failed to persist system rules", err);
    }
}

export function getSystemRules() {
    return normalizeRules(systemRules);
}

export function setSystemRule(section, value) {
    if (!section) return;
    if (section === "dynamic" && !Array.isArray(value)) return;
    systemRules = {
        ...systemRules,
        [section]: section === "dynamic" ? value.slice() : value
    };
    persist();
}

export function updateSystemRules(patch = {}) {
    systemRules = {
        ...systemRules,
        ...patch,
        dynamic: patch.dynamic
            ? patch.dynamic.slice()
            : systemRules.dynamic.slice()
    };
    persist();
}

export function appendDynamicRule(text) {
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    systemRules.dynamic = systemRules.dynamic || [];
    systemRules.dynamic.push(trimmed);
    appendDynamicToActive(trimmed);
    persist();
}

export function clearSystemRules() {
    systemRules = structuredClone(defaultRules);
    persist();
}

export function loadSystemRules() {
    systemRules = loadFromStorage();
    return getSystemRules();
}

export function buildSystemPrompt() {
    const rules = getSystemRules();
    const card = getActiveCard();
    const segments = [
        card.worldLore || rules.world,
        card.persona || rules.persona,
        card.rules || rules.rules
    ];
    const dynamic = (card.dynamic && card.dynamic.length) ? card.dynamic : rules.dynamic;
    if (dynamic.length) {
        segments.push(dynamic.join("\n"));
    }
    return segments.filter(Boolean).join("\n");
}

function structuredClone(value) {
    if (typeof window !== "undefined" && window.structuredClone) {
        return window.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

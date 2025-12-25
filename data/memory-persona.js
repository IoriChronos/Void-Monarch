const STORAGE_KEY = "yuan-phone:persona-memory";
const MAX_ITEMS = 30;

let personaMemory = load();

function load() {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.slice(-MAX_ITEMS) : [];
    } catch {
        return [];
    }
}

function persist() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(personaMemory.slice(-MAX_ITEMS)));
    } catch (err) {
        console.warn("Failed to persist persona memory", err);
    }
}

export function getPersonaMemory() {
    return personaMemory.slice();
}

export function addPersonaMemory(entry) {
    if (!entry) return;
    const clean = typeof entry === "string" ? entry.trim() : "";
    if (!clean) return;
    personaMemory.push({
        text: clean,
        time: Date.now()
    });
    if (personaMemory.length > MAX_ITEMS) {
        personaMemory.splice(0, personaMemory.length - MAX_ITEMS);
    }
    persist();
}

export function loadPersonaMemory(list = []) {
    personaMemory = Array.isArray(list) ? list.slice(-MAX_ITEMS) : [];
    persist();
}

export function clearPersonaMemory() {
    personaMemory = [];
    persist();
}

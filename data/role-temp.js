import { getWorldState, setWorldState } from "./world-state.js";
import { getLongMemory, loadLongMemory } from "./memory-long.js";
import { getShortMemory, hydrateShortMemory } from "./memory-short.js";
import { getSystemRules, updateSystemRules } from "./system-rules.js";

const KEY = "yuan-phone:role-temp";

function storage() {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
}

export function saveRoleTemp(roleId, meta = {}) {
    const store = storage();
    if (!store || !roleId) return;
    const payload = {
        roleId,
        roleName: meta.roleName || "",
        savedAt: Date.now(),
        worldState: getWorldState(),
        memoryLong: getLongMemory(),
        memoryShort: getShortMemory(),
        systemRules: getSystemRules()
    };
    try {
        store.setItem(KEY, JSON.stringify(payload));
    } catch (err) {
        console.warn("saveRoleTemp failed", err);
    }
}

export function loadRoleTemp(roleId) {
    const store = storage();
    if (!store || !roleId) return null;
    const raw = store.getItem(KEY);
    if (!raw) return null;
    try {
        const payload = JSON.parse(raw);
        if (payload.roleId !== roleId) return null;
        applyPayload(payload);
        store.removeItem(KEY);
        return payload;
    } catch (err) {
        console.warn("loadRoleTemp failed", err);
        return null;
    }
}

export function clearRoleTemp() {
    const store = storage();
    if (!store) return;
    store.removeItem(KEY);
}

export function peekRoleTemp() {
    const store = storage();
    if (!store) return null;
    const raw = store.getItem(KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function applyPayload(payload) {
    if (payload.worldState) setWorldState(payload.worldState);
    if (payload.memoryLong) loadLongMemory(payload.memoryLong);
    if (payload.memoryShort) hydrateShortMemory(payload.memoryShort);
    if (payload.systemRules) updateSystemRules(payload.systemRules);
}

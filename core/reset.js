import { getSeedState, updateWorldState, initializeWorldState } from "../data/world-state.js";
import { hydrateShortMemory } from "../data/memory-short.js";
import { loadLongMemory } from "../data/memory-long.js";
import { clearSystemRules } from "../data/system-rules.js";
import { saveWorldStateSnapshot, saveLongMemorySnapshot } from "./storage.js";

function clone(value) {
    if (typeof window !== "undefined" && window.structuredClone) {
        return window.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

function replaceArray(target, source) {
    if (!Array.isArray(target) || !Array.isArray(source)) return;
    target.length = 0;
    source.forEach(item => {
        target.push(clone(item));
    });
}

export function resetStory() {
    const seed = getSeedState();
    updateWorldState(state => {
        state.story = seed.story.map(entry => ({ ...entry }));
    }, "reset:story");
    hydrateShortMemory(seed.story);
    loadLongMemory([]);
    saveWorldStateSnapshot();
    saveLongMemorySnapshot([]);
}

export function resetPhone() {
    const seed = getSeedState();
    updateWorldState(state => {
        replaceArray(state.chats, seed.chats);
        state.chatOrder = seed.chatOrder.slice();
        replaceArray(state.moments, seed.moments);
        replaceArray(state.callHistory, seed.callHistory);
        state.memoEntries = [];
        state.eventsLog = [];
        state.wallet = clone(seed.wallet);
        state.unread = clone(seed.unread);
        state.unreadMomentsCount = seed.unreadMomentsCount;
    }, "reset:phone");
    saveWorldStateSnapshot();
}

export function resetAll() {
    const seed = getSeedState();
    initializeWorldState(seed);
    loadLongMemory([]);
    hydrateShortMemory(seed.story);
    clearSystemRules();
    saveWorldStateSnapshot();
    saveLongMemorySnapshot([]);
}

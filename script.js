import { updateState } from "./core/state.js";
import { syncStateWithStorage } from "./core/storage.js";
import { initAIChatWindow } from "./ui/ai-chat-window.js";
import {
    initPhoneUI,
    playSpecialFloatNotification
} from "./ui/phone.js";
import { initDynamicIsland } from "./ui/dynamic-island.js";
import { initMemoApp, addMemoEntry } from "./apps/memo.js";
import { initWeChatApp, triggerWeChatNotification, triggerMomentsNotification, refreshWeChatUI } from "./apps/wechat.js";
import { initShoppingApp } from "./apps/shopping.js";
import { initMMOApp } from "./apps/mmo.js";
import { handleIslandCallAction, triggerIncomingCall, resetCallInterface } from "./apps/phone.js";
import { setTriggerHandlers, checkTriggers } from "./core/triggers.js";
import {
    generateNarrativeReply,
    getProviderOptions,
    setActiveProvider,
    getActiveProviderId
} from "./core/ai.js";
import { applyAction } from "./core/action-router.js";
import { getWorldState, addStoryMessage, subscribeWorldState, trimStoryAfter, editStoryMessage } from "./data/world-state.js";
import { resetStory, resetPhone, resetAll } from "./core/reset.js";
import { updateSystemRules, appendDynamicRule } from "./data/system-rules.js";
import { saveSnapshot, restoreSnapshot, dropSnapshotsAfter } from "./core/timeline.js";
import { getLongMemoryContextLimit, setLongMemoryContextLimit } from "./data/memory-long.js";
import { addEventLog } from "./data/events-log.js";
import { initAbyssBackground } from "./ui/abyss-bg.js";

let storyUI = null;
let storyBound = false;
const abyssCooldown = {
    fog: 0,
    tentacle: 0,
    wave: 0,
    gaze: 0
};
const ABYSS_MIN_INTERVAL = {
    fog: 4500,
    tentacle: 7200,
    wave: 5200,
    gaze: 5200
};
let abyssBubbleCount = 0;
let lastAmbientAt = -3;
let abyssSilence = 0;

document.addEventListener("DOMContentLoaded", () => {
    const safe = (label, fn) => {
        try {
            return fn();
        } catch (err) {
            console.error(`[Init:${label}]`, err);
            return null;
        }
    };

    safe("storage", () => syncStateWithStorage());
    safe("snapshot", () => saveSnapshot("boot"));
    safe("abyss-bg", () => initAbyssBackground());
    safe("dynamic-island", () => initDynamicIsland({ onCallAction: handleIslandCallAction }));
    safe("clock", () => initClock());
    safe("battery", () => initBattery());

    safe("memo", () => initMemoApp());
    safe("shopping", () => initShoppingApp());
    safe("mmo", () => initMMOApp());
    safe("phone", () => initPhoneUI({
        onAppOpen: (id, label) => {
            const name = label || id;
            addMemoEntry(`打开 ${name}`);
            updateState("lastAppOpened", name);
        }
    }));
    safe("wechat", () => initWeChatApp());
    safe("triggers", () => setTriggerHandlers({
        wechat: () => triggerWeChatNotification("剧情联动").catch(err => console.error(err)),
        call: () => triggerIncomingCall("元书 · 来电"),
        moments: (detail) => triggerMomentsNotification(detail || {}).catch(err => console.error(err)),
        notify: (label) => playSpecialFloatNotification(`${label} 提醒`)
    }));

    storyUI = safe("story-ui", () => initAIChatWindow({
        onSubmit: handleStorySubmit,
        onSystemSubmit: handleSystemInput,
        onRestart: handleRestartRequest,
        onContinue: handleContinueRequest,
        onBubbleAction: handleBubbleAction,
        onEditMessage: handleEditMessage,
        longMemoryLimit: getLongMemoryContextLimit(),
        onLongMemoryChange: handleLongMemoryChange,
        providerOptions: getProviderOptions(),
        currentProvider: getActiveProviderId(),
        onProviderChange: handleProviderChange
    })) || {};
    safe("story-hydrate", () => hydrateStoryLog());
    safe("story-stream", () => bindStoryStream());

    window.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
            const maybe = checkTriggers(event.data);
            if (maybe && typeof maybe.then === "function") {
                maybe.catch(err => console.error(err));
            }
        }
    });

    window.addEventListener("timeline:overflow", () => {
        storyUI?.showTimelineToast?.("旧的快照已覆盖");
    });
});

function hydrateStoryLog() {
    const history = getWorldState().story || [];
    storyUI.replaceHistory?.(history);
}

function bindStoryStream() {
    if (storyBound) return;
    subscribeWorldState((path, detail) => {
        if (path === "story:append" && detail?.message) {
            const bubble = storyUI?.appendBubble(detail.message);
            const snapshotId = saveSnapshot(`${detail.message.role}:${Date.now()}`);
            if (snapshotId) {
                detail.message.snapshotId = snapshotId;
                storyUI?.setBubbleSnapshot?.(bubble, snapshotId);
            }
            stirAbyss(detail.message);
        } else if (path === "story:update" && detail?.message) {
            storyUI?.updateBubble?.(detail.message);
        }
    });
    storyBound = true;
}

async function handleStorySubmit(text) {
    addStoryMessage("user", text);
    addEventLog({ text: `玩家：${text}`, type: "story" });
    await checkTriggers(text);
    await requestAIResponse(text, { skipTriggers: true });
}

async function handleContinueRequest() {
    await requestAIResponse("继续", { skipUser: true, skipTriggers: true });
}

function handleLongMemoryChange(value) {
    setLongMemoryContextLimit(value);
}

function handleProviderChange(providerId) {
    setActiveProvider(providerId);
}

async function handleBubbleAction(action, entry) {
    if (!action || !entry) return;
    if (action === "rewind" && entry.snapshotId) {
        const restored = restoreSnapshot(entry.snapshotId);
        if (restored) {
            hydrateStoryLog();
            refreshWeChatUI();
            resetCallInterface();
            storyUI.scrollToSnapshot?.(entry.snapshotId);
        }
    } else if (action === "retry" && entry.role === "system") {
        if (trimStoryAfter(entry.id)) {
            dropSnapshotsAfter(entry.snapshotId);
            hydrateStoryLog();
            refreshWeChatUI();
            resetCallInterface();
            await requestAIResponse("重说上一句", { skipUser: true, skipTriggers: true });
        }
    }
}

async function requestAIResponse(text, options = {}) {
    if (!options.skipTriggers) {
        await checkTriggers(text);
    }
    storyUI?.beginAiReplyGroup?.();
    try {
        const action = await generateNarrativeReply(text);
        if (action) {
            applyAction(action);
        } else {
            addStoryMessage("system", "(AI 无回复)");
        }
    } catch (err) {
        console.error("AI 剧情回复失败", err);
        addStoryMessage("system", "(AI 无回复)");
    } finally {
        storyUI?.endAiReplyGroup?.();
    }
}

function handleSystemInput(raw) {
    const text = raw.trim();
    if (!text) return;
    addStoryMessage("user", text, { meta: { systemInput: true } });
    addEventLog({ text: `系统指令：${text}`, type: "system" });
    const colonIndex = text.indexOf(":");
    if (colonIndex > -1) {
        const key = text.slice(0, colonIndex).trim().toLowerCase();
        const value = text.slice(colonIndex + 1).trim();
        if (!value) return;
        if (key === "persona" || key === "world" || key === "rules") {
            updateSystemRules({ [key]: value });
            return;
        }
    }
    appendDynamicRule(text);
}

function handleRestartRequest(kind) {
    if (kind === "story") {
        resetStory();
        refreshStoryLogView();
    } else if (kind === "phone") {
        resetPhone();
        refreshWeChatUI();
        resetCallInterface();
    } else if (kind === "all") {
        resetAll();
        refreshWeChatUI();
        resetCallInterface();
    }
    refreshStoryLogView();
    refreshAbyssBackground();
}

function refreshStoryLogView() {
    if (!storyUI) return;
    const history = getWorldState().story || [];
    storyUI.replaceHistory?.(history);
}

async function handleEditMessage(entry, newText) {
    if (!entry?.id || !newText) return false;
    const success = editStoryMessage(entry.id, newText);
    if (success) {
        addEventLog({ text: `修订 AI 回复：${newText}`, type: "story" });
    }
    return success;
}

function initClock() {
    updateTime();
    setInterval(updateTime, 1000);
}

function updateTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const el = document.getElementById("sb-time");
    if (el) el.textContent = `${hh}:${mm}`;
}

function initBattery() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(bat => {
        function updateBattery() {
            const bar = document.getElementById("bat-level");
            if (bar) bar.style.width = `${bat.level * 100}%`;
        }
        updateBattery();
        bat.onlevelchange = updateBattery;
    });
}

function refreshAbyssBackground() {
    const panel = document.getElementById("story-panel");
    const engine = panel?.__abyssBg;
    if (engine && typeof engine.refresh === "function") {
        engine.refresh();
    }
}

function stirAbyss(entry) {
    if (!entry?.text) return;
    if (entry.role && entry.role !== "system") return;
    const engine = document.getElementById("story-panel")?.__abyssBg;
    if (!engine) return;
    if (isDialogueOnly(entry)) return;
    if (abyssSilence > 0) {
        abyssSilence = Math.max(0, abyssSilence - 1);
        return;
    }

    const text = entry.text || "";
    const denseLen = text.replace(/\s+/g, "").length;
    const now = Date.now();
    abyssBubbleCount += 1;
    let used = 0;
    const tryUse = (fn) => {
        if (used >= 2 || !fn) return;
        used += 1;
        fn();
    };

    const ambientKeywords = /(夜里|深夜|灯光|雨|下雨|窗外|天色|房间里|安静|沉默|空气|阴冷|发凉)/;
    const presenceKeywords = /(靠近|贴近|站在你身后|低头|俯身|伸手|扣住|按住|不许|别动|听话)/;
    const gazeKeywords = /(看着你|盯着你|目光|记录|确认|规则|记住)/;
    const psycheKeywords = /(呼吸变慢|喉咙发紧|意识到|察觉|没法拒绝|无法反驳|被迫|不由自主)/;
    const disorientKeywords = /(忽然|突然|不对劲|像是|仿佛|时间停了一下)/;
    const worldJumpAncient = /(古代|宫殿|烛火|甲胄)/;
    const worldJumpBackrooms = /(后室|回廊|空房间|黄光)/;
    const worldJumpCultivation = /(修仙|灵气|阵法|山门)/;
    const tentacleKeywords = /(触手|缠绕|卷住|伸出|蠕)/;
    const eggKeywords = /(彩蛋|小游戏|符印|点击|小机关)/;

    const triggerAmbient = (ambientKeywords.test(text) || denseLen >= 45) && (abyssBubbleCount - lastAmbientAt >= 3);

    // Anomaly tier
    const jumpHit = worldJumpAncient.test(text) || worldJumpBackrooms.test(text) || worldJumpCultivation.test(text);
    if (jumpHit) {
        tryUse(() => {
            engine.fog?.("shift", 1.1 + Math.random() * 0.4);
            engine.spaceWarp?.();
        });
        markAwaken("fog", now);
        abyssSilence = 3;
        lastAmbientAt = abyssBubbleCount;
        return;
    }
    if (disorientKeywords.test(text)) {
        tryUse(() => engine.glitchFlash?.());
        if (Math.random() > 0.5) {
            tryUse(() => engine.dimSurround?.(0.25 + Math.random() * 0.2));
        }
    }

    // Presence / Control
    if (presenceKeywords.test(text)) {
        if (canAwaken("gaze", now)) {
            tryUse(() => {
                engine.predatorGaze?.((-4 + Math.random() * 8).toFixed(1));
                markAwaken("gaze", now);
            });
        }
    } else if (gazeKeywords.test(text) && canAwaken("gaze", now)) {
        tryUse(() => {
            engine.predatorGaze?.((-6 + Math.random() * 12).toFixed(1));
            markAwaken("gaze", now);
        });
    }

    if (psycheKeywords.test(text)) {
        tryUse(() => engine.dimSurround?.(0.35 + Math.random() * 0.25));
    }

    if (tentacleKeywords.test(text) && canAwaken("tentacle", now)) {
        const count = Math.random() > 0.5 ? 2 : 1;
        const speed = 0.8 + Math.random() * 0.6;
        const thickness = 0.8 + Math.random() * 0.9;
        tryUse(() => engine.summonTentacle?.({ count, speed, thickness }));
        markAwaken("tentacle", now);
    }

    if (eggKeywords.test(text)) {
        tryUse(() => engine.glitchFlash?.());
        tryUse(() => engine.showSigil?.());
    }

    // Ambient (last)
    if (triggerAmbient && canAwaken("fog", now)) {
        const power = 0.8 + Math.random() * 0.5;
        tryUse(() => engine.fog?.("soft", power));
        lastAmbientAt = abyssBubbleCount;
        markAwaken("fog", now);
    }
}

function canAwaken(key, now) {
    const last = abyssCooldown[key] || 0;
    return now - last > (ABYSS_MIN_INTERVAL[key] || 4000);
}

function markAwaken(key, now) {
    abyssCooldown[key] = now;
}

function isDialogueOnly(entry) {
    if (entry?.meta?.storyType === "dialogue") return true;
    const text = entry?.text || "";
    return /^#?D\b/m.test(text);
}

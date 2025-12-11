import { AI_CONFIG, AI_PROVIDERS } from "../config.js";
import { getWorldState } from "../data/world-state.js";
import { getShortMemory } from "../data/memory-short.js";
import {
    getLongMemory,
    addLongMemoryEpisode,
    getLongMemoryContextLimit
} from "../data/memory-long.js";
import { buildSystemPrompt } from "../data/system-rules.js";

const PROVIDER_STORAGE_KEY = "yuan-phone:ai-provider";
const TASK_MODEL_MAP = {
    story: "PRIMARY_STORY_MODEL",
    summarize: "CHEAP_SUMMARIZER_MODEL",
    classify: "ROUTER_MODEL",
    "tool-plan": "ROUTER_MODEL"
};

let activeProviderId = loadActiveProviderId();

function loadActiveProviderId() {
    if (typeof window === "undefined" || !window.localStorage) {
        return AI_CONFIG.defaultProvider || (AI_PROVIDERS[0]?.id ?? "groq");
    }
    const saved = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
    return saved || AI_CONFIG.defaultProvider || (AI_PROVIDERS[0]?.id ?? "groq");
}

function persistActiveProvider(id) {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(PROVIDER_STORAGE_KEY, id);
}

function resolveProvider(id = activeProviderId) {
    return AI_PROVIDERS.find(p => p.id === id) || AI_PROVIDERS[0] || {
        id: "default",
        label: "Default",
        apiKey: "",
        apiBase: "",
        PRIMARY_STORY_MODEL: AI_CONFIG.PRIMARY_STORY_MODEL,
        CHEAP_SUMMARIZER_MODEL: AI_CONFIG.CHEAP_SUMMARIZER_MODEL,
        ROUTER_MODEL: AI_CONFIG.ROUTER_MODEL
    };
}

export function getProviderOptions() {
    return AI_PROVIDERS.map(provider => ({
        id: provider.id,
        label: provider.label
    }));
}

export function getActiveProviderId() {
    return activeProviderId;
}

export function setActiveProvider(id) {
    if (!id || id === activeProviderId) return resolveProvider();
    activeProviderId = id;
    persistActiveProvider(id);
    return resolveProvider();
}

export async function callModel(task = "story", { messages = [], maxTokens } = {}) {
    const provider = resolveProvider();
    const modelKey = TASK_MODEL_MAP[task] || TASK_MODEL_MAP.story;
    const modelName = provider[modelKey] || AI_CONFIG[modelKey];
    if (!modelName) {
        throw new Error(`Missing model for task ${task}`);
    }
    const body = {
        model: modelName,
        messages
    };
    if (maxTokens) {
        body.max_tokens = maxTokens;
    }
    return performAIRequest(provider, body);
}

async function performAIRequest(provider, body) {
    try {
        const systemPrompt = buildSystemPrompt();
        const hasSystem = body.messages.some(msg => msg.role === "system");
        if (!hasSystem && AI_CONFIG.systemPrompt) {
            body.messages.unshift({ role: "system", content: AI_CONFIG.systemPrompt });
        }
        if (systemPrompt) {
            body.messages.unshift({ role: "system", content: systemPrompt });
        }
        const res = await fetch(provider.apiBase, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${provider.apiKey}`
            },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        return json.choices?.[0]?.message?.content || "";
    } catch (err) {
        console.warn("AI request failed", err);
        return "";
    }
}

export async function askAI(userInput = "") {
    const prompt = buildContextDocument(userInput);
    const reply = await callModel("story", {
        messages: [
            { role: "system", content: AI_CONFIG.systemPrompt },
            { role: "user", content: prompt }
        ]
    });
    return reply || "";
}

export async function generateNarrativeReply(userInput) {
    // ====== 本地测试版：用于验证气泡、字体、换行、关键词效果 ======
    const demos = {
        fog: `
#N 黑雾在脚边盘绕，像是沿着墙根呼吸。远处的霓虹被噪点吞进深渊。
#A 他抬手，雾像两层幕布被掀开，露出更暗的空洞。
#D 别退。我在等你呼吸配合我。
        `.trim(),
        tentacle: `
#N 天花板滴下静电，影子里有触手卷出，细的一根绕住窗把，粗的一根拍在地上，蠕动着探向你。
#A 有一根半透明的触手从屏幕上方探下来，轻轻扫过气泡文字，像在测温。
#D 抬脚。你让它试试，还是让它绕上来？
        `.trim(),
        gaze: `
#N 捕食者的目光像聚焦光圈，锁在你喉结。他的规则被念出：不许后退，不许眨眼。
#S 他每说一句，空气就压出一圈金线波纹，像心跳一样扩散又收紧。
#D 念出你的心率。
        `.trim(),
        chaos: `
#N 一枚像素化的花体字母从气泡里掉出来，在空中抖动，落地变成碎光。
#A 你碰到它，屏幕弹出小游戏：在十五秒内点击四个符印，否则雾会把文字吞掉。
#N 同时，右上角有个符号闪烁，点一下会溅出一串金红碎片，再次点会出现一条细触手绕圈后消失。
#D 玩还是不玩？——他的声音带笑意。期待效果：触发 glitch 闪烁 + 许可光晕 + 触手覆在文字上方。
        `.trim()
    };

    const picked = pickDemo(userInput, demos);
    const demoText = picked || demos.gaze;

    return {
        action: "reply_story",
        payload: { 
            text: demoText,
            isAI: true,              // ⬅ 必须：告诉引擎这是 AI 回复
            type: "story",           // ⬅ 必须：强制进入“故事剧情解析”管线
            meta: { parsed: false }  // ⬅ 强制触发 parser，而不是原样输出
        }
    };
}

function pickDemo(userInput, demos) {
    const text = (userInput || "").toLowerCase();
    if (text.includes("tentacle") || text.includes("触手")) return demos.tentacle;
    if (text.includes("fog") || text.includes("雾")) return demos.fog;
    if (text.includes("gaze") || text.includes("凝视")) return demos.gaze;
    if (text.includes("chaos") || text.includes("彩蛋") || text.includes("小游戏")) return demos.chaos;
    const list = Object.values(demos);
    return list[Math.floor(Math.random() * list.length)];
}

export async function generatePhoneMessage(chatId) {
    const contact = getWorldState().chats.find(c => c.id === chatId) || { name: "元书" };
    return requestAction(
        "send_wechat",
        `对话对象：${contact.name}(${chatId})`,
        () => ({
            action: "send_wechat",
            payload: { chatId, text: "“我在看着你。”" }
        })
    );
}

export async function generateMomentComment(momentId) {
    const moment = getWorldState().moments.find(m => m.id === momentId) || getWorldState().moments[0];
    return requestAction(
        "add_moment_comment",
        moment ? `朋友圈：${moment.who} · ${moment.text}` : "朋友圈空白",
        () => ({
            action: "add_moment_comment",
            payload: { momentId: moment?.id || "m1", text: "留意夜色。" }
        })
    );
}

export async function generateCallDialogue() {
    return requestAction(
        "incoming_call",
        "生成通话来电",
        () => ({
            action: "incoming_call",
            payload: { name: "守望 · 来电", script: ["接吗？", "信号里全是他。"] }
        })
    );
}

async function requestAction(kind, userInput, fallback) {
    const instruction = `
你是 YuanPhone 的世界驱动引擎。基于以下世界状态、短期记忆与长期记忆，返回一个 JSON：
{
  "action": "reply_story | send_wechat | add_moment_comment | incoming_call",
  "payload": { ... }
}
禁止说明文字，只能是 JSON。
Kind: ${kind}`.trim();
    const prompt = `${instruction}\n\n${buildContextDocument(userInput || "（剧情联动）")}`;
    const response = await callModel("story", {
        messages: [
            { role: "system", content: AI_CONFIG.systemPrompt },
            { role: "user", content: prompt }
        ]
    });
    const action = parseAction(response);
    return action || (typeof fallback === "function" ? fallback() : null);
}

function buildContextDocument(userInput) {
    const { sections } = composeContext();
    const rules = buildSystemPrompt();
    const parts = [
        rules ? `SYSTEM RULES:\n${rules}` : "",
        `LONG MEMORY (${sections.longMemory.count} 条)：\n${sections.longMemory.text}`,
        `SHORT MEMORY · 剧情 (${sections.short.storyCount})：\n${sections.short.storyText}`,
        `SHORT MEMORY · 手机 (${sections.short.eventCount})：\n${sections.short.eventText}`,
        `WORLD SNAPSHOT：\n${sections.world}`,
        `CURRENT INPUT：\n${userInput || "……"}`
    ].filter(Boolean);
    return parts.join("\n\n");
}

function composeContext() {
    const world = getWorldState();
    const shortMemory = normalizeShortMemory(getShortMemory());
    const longState = normalizeLongMemory(getLongMemory());
    const limit = getLongMemoryContextLimit();
    const longEpisodes = longState.slice(-limit);
    const storyLines = shortMemory.story.map(formatStoryMemory).join("\n") || "（空）";
    const eventLines = shortMemory.events.map(formatEventMemory).join("\n") || "（空）";
    const worldSnapshot = JSON.stringify({
        chats: world.chats.slice(0, 3).map(chat => ({
            id: chat.id,
            name: chat.name,
            unread: chat.unread,
            preview: chat.preview
        })),
        moments: world.moments.slice(0, 2).map(m => ({
            who: m.who,
            text: m.text,
            likes: m.likes,
            recentComments: (m.comments || []).slice(-2)
        })),
        wallet: world.wallet?.balance ?? 0,
        unread: world.unread
    });
    const longText = longEpisodes
        .map((ep, idx) => `${idx + 1}. ${ep.summary}`)
        .join("\n") || "（无总结）";
    return {
        sections: {
            longMemory: { count: longEpisodes.length, text: longText },
            short: {
                storyCount: shortMemory.story.length,
                storyText: storyLines,
                eventCount: shortMemory.events.length,
                eventText: eventLines
            },
            world: worldSnapshot
        }
    };
}

function normalizeShortMemory(memory = {}) {
    if (Array.isArray(memory)) {
        return { story: memory.slice(-20), events: [] };
    }
    return {
        story: Array.isArray(memory.story) ? memory.story.slice() : [],
        events: Array.isArray(memory.events) ? memory.events.slice() : []
    };
}

function normalizeLongMemory(data) {
    if (Array.isArray(data)) return data.slice();
    if (!data || !Array.isArray(data.episodes)) return [];
    return data.episodes.slice();
}

function formatStoryMemory(entry) {
    const role = entry.role === "user" ? "我" : entry.role === "system" ? "元书" : entry.role;
    return `${role}：${entry.text}`;
}

function formatEventMemory(entry) {
    const badge = entry.app === "moments" ? "朋友圈" : entry.app === "phone" ? "电话" : "微信";
    return `[${badge}] ${entry.text}`;
}

function parseAction(text) {
    if (!text) return null;
    try {
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start >= 0 && end > start) {
            return JSON.parse(text.slice(start, end + 1));
        }
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export function recordLongMemory(entry) {
    if (!entry) return;
    const summary = entry.text || JSON.stringify(entry);
    addLongMemoryEpisode({
        summary: `剧情：${summary}`,
        tags: entry.tags || ["story"]
    });
}

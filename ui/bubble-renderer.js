import { initSceneEffects } from "./scene-effects.js";

const TAG_TYPE = {
    N: "narration",
    A: "action",
    T: "thought",
    S: "system",
    D: "dialog"
};

const SOUND_WORDS = /(嗒|咚|咔噗|砰|滴答|嗡|噗嗤|嘶|咔)/;
const FOG_WORDS = /(黑雾|深渊|压迫|冰冷|呼吸靠近)/;
const ACTION_SHAKE_WORDS = /(抓住|攥住|用力拉住|壁咚|推向门板|扣在门上|压在墙上)/;

const KEYWORD_RULES = [
    {
        className: "kw-violence",
        terms: ["杀掉", "撕开", "扯断", "折断", "砸碎", "血", "撕", "杀"]
    },
    {
        className: "kw-control",
        terms: ["捏住", "按住", "抓住", "拦住", "钉住", "困住", "控制", "掐住", "锁住", "跟着你", "别躲", "不许", "不想听"]
    },
    {
        className: "kw-gaze",
        terms: ["目光", "眼睛", "瞳", "视线", "盯", "打量", "审视", "俯视"]
    },
    {
        className: "kw-close",
        terms: ["走近", "靠近", "靠得很近", "贴着", "俯在", "靠在", "贴住", "靠得太近", "贴着你的呼吸"]
    },
    {
        className: "kw-rule",
        terms: ["提前告诉我", "下次", "规则", "不浪费时间", "宣告", "选择", "划线", "别提", "别说"]
    },
    {
        className: "kw-env",
        terms: ["灯光", "霓虹", "广播", "噪点", "冷气", "雨声", "电流", "卡顿"]
    },
    {
        className: "kw-soft",
        terms: ["牛奶", "热牛奶", "甜品", "泡芙", "糖", "咬一口"]
    }
];

export function renderStoryBubble(entry, options = {}) {
    const { sceneFX, lastFxHandle } = options;
    const fxInstruction = detectFxInstruction(entry.text);
    if (fxInstruction) {
        sceneFX?.triggerInstruction?.(lastFxHandle, fxInstruction);
        return { handledFx: fxInstruction };
    }

    const meta = parseMeta(entry);
    const isBubbleType = ["dialog", "thought", "system"].includes(meta.type);
    const node = document.createElement("div");

    if (isBubbleType) {
        applyBubbleClasses(node, entry, meta);
        const content = document.createElement("div");
        content.className = "bubble-content";
        content.innerHTML = buildParagraphHtml(meta);
        node.appendChild(content);

        if (meta.type === "system") {
            const icon = createPixelCanvas();
            if (icon) {
                icon.classList.add("system-icon");
                const side = Math.random() > 0.5 ? "right" : "left";
                icon.dataset.side = side;
                const offsetY = (-10 + Math.random() * 16).toFixed(1);
                icon.style.setProperty("--icon-offset-y", `${offsetY}px`);
                node.insertBefore(icon, content);
            }
        }
    } else {
        node.className = `story-block block-${meta.type || "text"}`;
        if (meta.textLength > 120) {
            node.classList.add("block-reading");
        }
        if (meta.shortLine) {
            node.classList.add("block-key");
        }
        node.innerHTML = buildParagraphHtml(meta);
    }

    let fxHandle = null;
    if (isBubbleType && sceneFX) {
        fxHandle = sceneFX.attachToBubble?.(node, meta);
        sceneFX.applyAutomatic?.(fxHandle, meta, entry.role);
    }

    return { bubble: node, meta, fxHandle };
}

export function initRendererFx(panel) {
    return initSceneEffects(panel);
}

function detectFxInstruction(text = "") {
    const match = text.trim().match(/^#FX\s+([A-Z]+)\b/i);
    if (!match) return null;
    return match[1];
}

function parseMeta(entry) {
    let raw = entry.text || "";
    const tagMatch = raw.match(/^#([A-Z]+)\s*/);
    let tag = null;
    if (tagMatch) {
        tag = tagMatch[1];
        raw = raw.slice(tagMatch[0].length);
    }
    let type = TAG_TYPE[tag] || null;
    if (!type) {
        if (entry.role === "user") type = "dialog";
        else if (entry.role === "system") type = tag === "S" ? "system" : "narration";
        else type = "dialog";
    }
    const cleanText = raw.trim();
    const strippedLength = cleanText.replace(/\s+/g, "").length;
    const paragraphs = cleanText.split(/\n+/).filter(Boolean);
    const singleLine = paragraphs.length === 1;
    const shortLine = strippedLength > 0 && strippedLength <= 16 && singleLine;
    const fogLine = FOG_WORDS.test(cleanText) && strippedLength > 10;
    const actionShake = ACTION_SHAKE_WORDS.test(cleanText);

    return {
        ...entry,
        type,
        cleanText,
        paragraphs,
        textLength: strippedLength,
        shortLine,
        fogLine,
        actionShake
    };
}

function applyBubbleClasses(bubble, entry, meta) {
    bubble.classList.add("story-bubble");
    if (meta.type === "system") {
        bubble.classList.add("bubble-system");
        return;
    }
    if (meta.type === "thought") {
        bubble.classList.add("bubble-thought");
        bubble.classList.add("bubble-center");
    } else {
        bubble.classList.add("bubble-dialog");
        bubble.classList.add(entry.role === "user" ? "bubble-user" : "bubble-assistant");
        const len = meta.textLength || 0;
        if (len < 25) bubble.classList.add("dialog-short");
        else if (len > 120) bubble.classList.add("dialog-long");
        else bubble.classList.add("dialog-medium");
    }
}

function buildParagraphHtml(meta) {
    if (!meta.paragraphs.length) {
        meta.paragraphs = [meta.cleanText];
    }
    return meta.paragraphs
        .map((text, index) => formatParagraph(text, meta, index === 0))
        .join("");
}

function formatParagraph(text, meta, isFirst) {
    const trimmed = text.trim();
    const shortLine = trimmed.length > 0 && trimmed.length <= 16;
    const soundLine = SOUND_WORDS.test(trimmed);
    let html = applyKeywordHighlighting(text);
    html = applyInlineFormatting(html);
    const classes = [];
    if (meta.type === "narration" || meta.type === "action") {
        classes.push("narration-paragraph");
        if (shortLine) classes.push("key-sentence");
    }
    if (soundLine) classes.push("sound-line");
    if (isFirst && meta.type === "narration" && !shortLine) {
        classes.push("narration-lead");
    }
    if (meta.type === "thought") {
        classes.push("thought-line");
    }
    return `<p${classes.length ? ` class="${classes.join(" ")}"` : ""}>${html}</p>`;
}

function createPixelCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 22;
    canvas.height = 22;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.clearRect(0, 0, 22, 22);
    drawEye(ctx);
    return canvas;
}

function drawEye(ctx) {
    ctx.fillStyle = "#06020a";
    ctx.fillRect(0, 0, 22, 22);
    ctx.fillStyle = "#2f0f2a";
    ctx.fillRect(4, 9, 14, 4);
    ctx.fillStyle = "#d7c1ff";
    ctx.fillRect(6, 8, 10, 6);
    ctx.fillStyle = "#1a072d";
    ctx.fillRect(9, 9, 4, 4);
    ctx.fillStyle = "#fff";
    ctx.fillRect(10, 10, 1, 1);
}

function applyKeywordHighlighting(text = "") {
    if (!text) return "";
    const ranges = [];
    KEYWORD_RULES.forEach(rule => {
        const regex = buildKeywordRegex(rule);
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            if (hasOverlap(ranges, start, end)) continue;
            ranges.push({ start, end, className: rule.className });
        }
    });
    if (!ranges.length) {
        return escapeHtml(text);
    }
    ranges.sort((a, b) => a.start - b.start);
    let cursor = 0;
    let html = "";
    ranges.forEach(range => {
        if (cursor < range.start) {
            html += escapeHtml(text.slice(cursor, range.start));
        }
        html += `<span class="${range.className}">${escapeHtml(text.slice(range.start, range.end))}</span>`;
        cursor = range.end;
    });
    if (cursor < text.length) {
        html += escapeHtml(text.slice(cursor));
    }
    return html;
}

function applyInlineFormatting(html = "") {
    return html
        .replace(/\*\*(.+?)\*\*/gs, (_, inner) => `<span class="em-strong">${inner}</span>`)
        .replace(/_(.+?)_/gs, (_, inner) => `<span class="italic-soft">${inner}</span>`)
        .replace(/~~(.+?)~~/gs, (_, inner) => `<span class="strike-veil">${inner}</span>`)
        .replace(/`([^`]+)`/g, (_, inner) => `<code class="inline-code">${inner}</code>`)
        .replace(/“([^”]+)”/g, (_, inner) => `“<span class="quote-highlight">${inner}</span>”`);
}

function buildKeywordRegex(rule) {
    if (rule.regex) return rule.regex;
    const escaped = rule.terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    rule.regex = new RegExp(escaped.join("|"), "g");
    return rule.regex;
}

function hasOverlap(ranges, start, end) {
    return ranges.some(range => !(end <= range.start || start >= range.end));
}

function escapeHtml(str = "") {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

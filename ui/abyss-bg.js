const LAYER1_COLORS = ["#1f0b17", "#35192b", "#5a2d4b", "#7b3a62", "#caa0ff"];
const LAYER2_COLORS = ["#c4a9ff", "#ffe1b9", "#e0ccff"];
const LAYER3_COLORS = ["#ffddb0", "#ffb7d6", "#d5a6ff"];

const LAYER1_COUNT = 100;
const LAYER2_COUNT = 70;
const LAYER3_COUNT = 24;

export function initAbyssBackground(panel = document.getElementById("story-panel")) {
    if (!panel) return null;
    if (panel.__abyssBg) return panel.__abyssBg;

    const root = document.createElement("div");
    root.id = "abyss-bg";
    const layer1 = document.createElement("canvas");
    layer1.id = "abyss-layer-1";
    const layer2 = document.createElement("canvas");
    layer2.id = "abyss-layer-2";
    const layer3 = document.createElement("canvas");
    layer3.id = "abyss-layer-3";
    root.append(layer1, layer2, layer3);
    panel.insertBefore(root, panel.firstChild);

    const engine = createAbyssEngine(panel, [layer1, layer2, layer3]);
    panel.__abyssBg = engine;
    return engine;
}

function createAbyssEngine(panel, canvases) {
    const [fogCanvas, sparkCanvas, pulseCanvas] = canvases;
    const fogCtx = fogCanvas.getContext("2d");
    const sparkCtx = sparkCanvas.getContext("2d");
    const pulseCtx = pulseCanvas.getContext("2d");

    let width = 0;
    let height = 0;

    let fogDust = [];
    let coldSparks = [];
    let heartMotes = [];
    let rafId = null;

    function resize() {
        const rect = panel.getBoundingClientRect();
        width = Math.floor(rect.width);
        height = Math.floor(rect.height);
        [fogCanvas, sparkCanvas, pulseCanvas].forEach(canvas => {
            canvas.width = width;
            canvas.height = height;
        });
        seedParticles();
    }

    function seedParticles() {
        fogDust = createFogDust(LAYER1_COUNT, width, height);
        coldSparks = createColdSparks(LAYER2_COUNT, width, height);
        heartMotes = createHeartMotes(LAYER3_COUNT, width, height);
    }

    function loop(timestamp = 0) {
        drawFogLayer(fogCtx, fogDust, width, height);
        drawSparkLayer(sparkCtx, coldSparks, width, height, timestamp);
        drawPulseLayer(pulseCtx, heartMotes, width, height, timestamp);
        rafId = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener("resize", resize);
    rafId = requestAnimationFrame(loop);

    return {
        refresh: seedParticles,
        destroy() {
            if (rafId) cancelAnimationFrame(rafId);
        }
    };
}

function createFogDust(count, width, height) {
    return Array.from({ length: count }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        alpha: 0.04 + Math.random() * 0.04,
        color: pick(LAYER1_COLORS),
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05,
        size: 0.6 + Math.random() * 1.2
    }));
}

function createColdSparks(count, width, height) {
    return Array.from({ length: count }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.2),
        vy: (Math.random() - 0.5) * 0.2,
        tail: 3 + Math.random() * 3,
        alpha: 0.12 + Math.random() * 0.08,
        color: pick(LAYER2_COLORS),
        phase: Math.random() * Math.PI * 2
    }));
}

function createHeartMotes(count, width, height) {
    return Array.from({ length: count }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        baseRadius: 1.2 + Math.random() * 1.2,
        pulseStrength: 1.6 + Math.random() * 0.8,
        freq: (0.6 + Math.random() * 0.6) * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.25 + Math.random() * 0.1,
        color: pick(LAYER3_COLORS)
    }));
}

function drawFogLayer(ctx, particles, width, height) {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        wrapParticle(p, width, height);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawSparkLayer(ctx, particles, width, height, timestamp) {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        wrapParticle(p, width, height);
        const flicker = 0.8 + Math.sin((timestamp / 500) + p.phase) * 0.2;
        ctx.globalAlpha = p.alpha * flicker;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * p.tail, p.y - p.vy * p.tail);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.6, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
}

function drawPulseLayer(ctx, particles, width, height, timestamp) {
    ctx.clearRect(0, 0, width, height);
    const time = timestamp / 1000;
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        wrapParticle(p, width, height);
        const radius = Math.max(0.4, p.baseRadius + Math.sin(time * p.freq + p.phase) * p.pulseStrength);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function wrapParticle(p, width, height) {
    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;
    if (p.y > height + 10) p.y = -10;
}

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

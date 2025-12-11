const LAYER1_COLORS = ["#12070f", "#1f0a1b", "#2e0c26", "#3c1231", "#160812"];
const LAYER2_COLORS = ["#f6c36a", "#d86a8a", "#b08cff"];
const LAYER3_COLORS = ["#ffb46e", "#ff7fa5", "#c38fff"];

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
    const fogBack = document.createElement("div");
    fogBack.className = "abyss-fog fog-back";
    const tentacleLayer = document.createElement("div");
    tentacleLayer.className = "abyss-tentacles";
    const fogFront = document.createElement("div");
    fogFront.className = "abyss-fog fog-front";
    const wave = document.createElement("div");
    wave.className = "abyss-pressure-wave";
    const gaze = document.createElement("div");
    gaze.className = "abyss-gaze";
    const dim = document.createElement("div");
    dim.className = "abyss-dim";
    const glitch = document.createElement("div");
    glitch.className = "abyss-glitch";
    const warp = document.createElement("div");
    warp.className = "abyss-warp";
    const permit = document.createElement("div");
    permit.className = "abyss-permission";
    root.append(layer1, layer2, layer3, fogBack, tentacleLayer, fogFront, wave, gaze, dim, glitch, warp, permit);
    panel.insertBefore(root, panel.firstChild);

    const engine = createAbyssEngine(panel, root, [layer1, layer2, layer3]);
    panel.__abyssBg = engine;
    return engine;
}

function createAbyssEngine(panel, root, canvases) {
    const [fogCanvas, sparkCanvas, pulseCanvas] = canvases;
    const fogCtx = fogCanvas.getContext("2d");
    const sparkCtx = sparkCanvas.getContext("2d");
    const pulseCtx = pulseCanvas.getContext("2d");
    const fogBack = root.querySelector(".fog-back");
    const fogFront = root.querySelector(".fog-front");
    const tentacleLayer = root.querySelector(".abyss-tentacles");
    const wave = root.querySelector(".abyss-pressure-wave");
    const gaze = root.querySelector(".abyss-gaze");
    const dim = root.querySelector(".abyss-dim");
    const glitch = root.querySelector(".abyss-glitch");
    const warp = root.querySelector(".abyss-warp");
    const permit = root.querySelector(".abyss-permission");
    const sigil = document.createElement("button");
    sigil.className = "abyss-sigil";
    sigil.type = "button";
    sigil.textContent = "✶";
    sigil.title = "点击符印";
    sigil.style.display = "none";
    root.appendChild(sigil);
    sigil.addEventListener("click", () => {
        sigil.classList.remove("show");
        sigil.style.display = "none";
        glitch?.classList.add("glitch-on");
        setTimeout(() => glitch?.classList.remove("glitch-on"), 900);
    });

    let width = 0;
    let height = 0;

    let fogDust = [];
    let coldSparks = [];
    let heartMotes = [];
    let rafId = null;
    let fogTimer = null;
    let waveTimer = null;
    let gazeTimer = null;
    let tentacleCount = 0;
    let dimTimer = null;
    let glitchTimer = null;
    let warpTimer = null;
    let permitTimer = null;
    let sigilTimer = null;

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
        fog(mode = "soft", power = 1) {
            root.classList.remove("fog-breathe", "fog-surged", "fog-soft", "fog-shift");
            const cls = mode === "shift" ? "fog-shift" : mode === "surge" ? "fog-surged" : "fog-soft";
            root.classList.add(cls);
            if (fogBack && fogFront) {
                const depth = Math.min(1.6, Math.max(0.6, power));
                fogBack.style.opacity = String(0.6 * depth);
                fogFront.style.opacity = String(0.9 * depth);
            }
            clearTimeout(fogTimer);
            fogTimer = setTimeout(() => root.classList.remove(cls), mode === "surge" ? 9000 : 7000);
        },
        summonTentacle(options = {}) {
            const { count = 1, speed = 1, thickness = 1 } = options;
            if (!tentacleLayer) return;
            if (tentacleCount > 4) return;
            const spawnCount = Math.max(1, Math.min(3, Math.round(count)));
            let overlaySpawned = false;
            for (let i = 0; i < spawnCount; i++) {
                const t = document.createElement("div");
                t.className = "abyss-tentacle";
                const overlay = !overlaySpawned && (i === 0 || Math.random() > 0.4);
                if (overlay) {
                    t.classList.add("overlay");
                    const top = -10 + Math.random() * 50;
                    t.style.top = `${top.toFixed(1)}%`;
                    t.style.bottom = "auto";
                    overlaySpawned = true;
                }
                const scale = 0.8 + Math.random() * 0.6;
                const wiggle = (0.8 + Math.random() * 0.6) * speed;
                const px = -10 + Math.random() * 100;
                const delay = Math.random() * 0.6;
                const life = 4800 + Math.random() * 2600;
                const thicknessScale = 0.7 + Math.random() * 0.7 * thickness;
                t.style.setProperty("--tentacle-scale", scale.toFixed(2));
                t.style.setProperty("--tentacle-wiggle", wiggle.toFixed(2));
                t.style.setProperty("--tentacle-left", `${px.toFixed(1)}%`);
                t.style.setProperty("--tentacle-delay", `${delay.toFixed(2)}s`);
                t.style.setProperty("--tentacle-thickness", thicknessScale.toFixed(2));
                tentacleLayer.appendChild(t);
                tentacleCount++;
                setTimeout(() => {
                    t.classList.add("retreat");
                    setTimeout(() => {
                        t.remove();
                        tentacleCount = Math.max(0, tentacleCount - 1);
                    }, 1200);
                }, life);
            }
        },
        pressureWave(mode = "pulse", intensity = 1) {
            root.classList.remove("wave-pulse", "wave-strike");
            const cls = mode === "strike" ? "wave-strike" : "wave-pulse";
            const power = Math.min(1.4, Math.max(0.8, intensity));
            if (wave) {
                wave.style.setProperty("--wave-scale", power.toFixed(2));
            }
            root.classList.add(cls);
            clearTimeout(waveTimer);
            waveTimer = setTimeout(() => root.classList.remove(cls), 2200);
        },
        predatorGaze(tilt = 0) {
            root.classList.add("gaze-on");
            if (gaze) {
                gaze.style.setProperty("--gaze-tilt", `${tilt}deg`);
            }
            clearTimeout(gazeTimer);
            gazeTimer = setTimeout(() => root.classList.remove("gaze-on"), 3600);
        },
        dimSurround(level = 0.5) {
            if (!dim) return;
            dim.style.setProperty("--dim-level", `${Math.min(0.7, Math.max(0.2, level))}`);
            dim.classList.add("dim-on");
            clearTimeout(dimTimer);
            dimTimer = setTimeout(() => dim.classList.remove("dim-on"), 2400);
        },
        glitchFlash() {
            if (!glitch) return;
            glitch.classList.add("glitch-on");
            clearTimeout(glitchTimer);
            glitchTimer = setTimeout(() => glitch.classList.remove("glitch-on"), 900);
        },
        spaceWarp() {
            if (!warp) return;
            warp.classList.add("warp-on");
            clearTimeout(warpTimer);
            warpTimer = setTimeout(() => warp.classList.remove("warp-on"), 1400);
        },
        allowGlow() {
            if (!permit) return;
            permit.classList.add("permit-on");
            clearTimeout(permitTimer);
            permitTimer = setTimeout(() => permit.classList.remove("permit-on"), 1800);
        },
        showSigil() {
            if (!sigil) return;
            sigil.style.display = "block";
            sigil.classList.add("show");
            clearTimeout(sigilTimer);
            sigilTimer = setTimeout(() => {
                sigil.classList.remove("show");
                sigil.style.display = "none";
            }, 6000);
        },
        destroy() {
            if (rafId) cancelAnimationFrame(rafId);
            clearTimeout(fogTimer);
            clearTimeout(waveTimer);
            clearTimeout(gazeTimer);
            clearTimeout(dimTimer);
            clearTimeout(glitchTimer);
            clearTimeout(warpTimer);
            clearTimeout(permitTimer);
            clearTimeout(sigilTimer);
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

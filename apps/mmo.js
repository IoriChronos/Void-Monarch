import { getGlobalUserName } from "../data/system-rules.js";
import { getState, updateState } from "../core/state.js";
import { showPhoneFloatingAlert } from "../ui/phone.js";
import { createPixelIconCanvas } from "../ui/pixel.js";

const STORAGE_KEY = "martial-mmo-state";
const CURRENCY_NAME = "灵玉";
const SHOP_ITEMS = buildShopItems();
const RECHARGE_TIERS = [6, 30, 68, 98, 128, 298, 598, 1200];
const GACHA_COST = 160;

let state = loadState();

function loadState() {
    if (typeof window === "undefined") return defaultState();
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        return { ...defaultState(), ...parsed };
    } catch {
        return defaultState();
    }
}

function defaultState() {
    return {
        coins: 0,
        pity: 0,
        score: 0,
        bag: [],
        ownedSetIds: [],
        leaderboard: seedLeaderboard(),
        login: false
    };
}

function saveState() {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* ignore */
    }
}

function addCoins(delta) {
    state.coins = Math.max(0, Math.round((state.coins || 0) + delta));
    saveState();
    renderCurrency();
}

function addScore(delta) {
    state.score = Math.max(0, Math.round((state.score || 0) + delta));
    saveState();
}

function updateLeaderboard() {
    const entries = state.leaderboard || [];
    const updated = entries.map(e => ({
        ...e,
        score: e.score + Math.floor(Math.random() * 101)
    }));
    state.leaderboard = updated;
    saveState();
}

function seedLeaderboard() {
    const names = [
        "江湖夜雨", "无锋客", "藏剑山客", "桃花酒", "夜行人", "青锋落雪", "听潮居士", "渡舟人",
        "燕北鸿", "轻罗扇", "摘星手", "月下笛", "折梅手", "双鱼佩", "雁来音", "无名客",
        "石上流泉", "云归鹤", "青衣行者", "弈剑人", "落霞影", "孤舟翁", "江畔月", "竹影斜",
        "踏雪客", "听雨楼", "青灯夜话", "梦回关山", "饮风人", "拾叶童", "北城剑", "烟雨客",
        "旧城凉", "残雪剑", "松间明月", "听松客", "忘川客", "清平愿", "浮灯渡", "问剑人",
        "杏花微雨", "剑胆琴心", "醉卧江湖", "折扇书生", "寒山夜行", "秋水长天", "无极行者", "落日长河", "夜幕行"
    ];
    const pool = [];
    for (let i = 0; i < 50; i++) {
        pool.push({
            name: names[i % names.length],
            score: 90000 + Math.floor(Math.random() * 40001)
        });
    }
    return pool;
}

function buildShopItems() {
    const names258 = ["龙吟行衣", "寒光夜行", "云海行袍", "青锋暮雪", "墨羽行歌", "紫电霜裘", "沧浪夜行", "玄鳞行甲", "锦鲤月裳", "孤影行尘"];
    const names128 = ["竹雾轻裳", "霜痕短褐", "夜鹭行衣", "星芒夜纱", "烟雨弓袍"];
    const names68 = ["灰衣行旅", "山客粗袍", "尘旅布衣", "素麻劲装"];
    const names6 = ["新手布衣"];
    const items = [];
    names258.forEach((name, idx) => items.push({ id: `set-258-${idx}`, name, price: 2580, score: 500 }));
    names128.forEach((name, idx) => items.push({ id: `set-128-${idx}`, name, price: 1280, score: 300 }));
    names68.forEach((name, idx) => items.push({ id: `set-68-${idx}`, name, price: 680, score: 220 }));
    names6.forEach((name, idx) => items.push({ id: `set-6-${idx}`, name, price: 60, score: 120 }));
    return items;
}

function ensureLoginAvatar() {
    const user = getGlobalUserName?.() || "侠客";
    return (user || "").trim().charAt(0) || "侠";
}

export function initMMOApp() {
    const page = document.getElementById("mmo-page");
    if (!page) return;
    bindLogin(page);
    renderCurrency();
    renderShop();
    renderLeaderboard();
    renderBag();
    renderRecharge();
    bindMenu(page);
    bindGacha(page);
    updateLeaderboard();
    paintParticles();
    page.dataset.ready = "true";
}

function bindLogin(page) {
    const shell = page.querySelector(".mmo-shell");
    const login = page.querySelector(".mmo-login");
    const main = page.querySelector(".mmo-main");
    const enterBtn = page.querySelector("[data-act='mmo-enter']");
    const avatar = page.querySelector("#mmo-avatar-initial");
    if (avatar) avatar.textContent = ensureLoginAvatar();
    if (state.login && main && login) {
        shell?.setAttribute("data-state", "game");
        login.hidden = true;
        main.hidden = false;
        switchView("home", page);
    }
    enterBtn?.addEventListener("click", () => {
        state.login = true;
        saveState();
        shell?.setAttribute("data-state", "game");
        if (login) login.hidden = true;
        if (main) main.hidden = false;
        switchView("home", page);
    });
}

function bindMenu(page) {
    const menuBtn = page.querySelector("[data-act='toggle-menu']");
    const menu = page.querySelector(".mmo-menu");
    const content = page.querySelector(".mmo-content");
    const avatar = page.querySelector(".mmo-avatar");
    menuBtn?.addEventListener("click", () => {
        const open = menu?.classList.toggle("open");
        menu?.setAttribute("aria-hidden", String(!open));
    });
    menu?.querySelectorAll("button[data-view]").forEach(btn => {
        btn.addEventListener("click", () => {
            switchView(btn.dataset.view, page);
            menu?.classList.remove("open");
            menu?.setAttribute("aria-hidden", "true");
        });
    });
    content?.querySelectorAll("[data-view-target]").forEach(btn => {
        btn.addEventListener("click", () => switchView(btn.dataset.viewTarget, page));
    });
    avatar?.addEventListener("click", () => switchView("bag", page));
}

function switchView(view, page) {
    const views = page.querySelectorAll(".mmo-view");
    views.forEach(v => {
        const show = v.dataset.view === view;
        v.hidden = !show;
    });
    page.dataset.activeView = view;
    renderCurrency();
    renderBag();
    renderLeaderboard();
    if (view === "shop") renderShop();
    if (view === "gacha") renderGachaHeader();
    if (view === "recharge") renderRecharge();
}

function renderCurrency() {
    const coins = state.coins || 0;
    document.querySelectorAll("#mmo-currency-main,#mmo-currency-shop,#mmo-currency-gacha,#mmo-currency-recharge,#mmo-currency-leader,#mmo-currency-bag,#mmo-currency-pixel").forEach(el => {
        if (!el) return;
        el.innerHTML = "";
        const icon = createPixelIconCanvas("jade");
        icon.classList.add("mmo-coin-icon");
        icon.width = 18;
        icon.height = 18;
        const text = document.createElement("span");
        text.className = "mmo-coin-text";
        text.textContent = `${CURRENCY_NAME}：${coins}`;
        el.appendChild(icon);
        el.appendChild(text);
    });
}

function renderShop() {
    const list = document.getElementById("mmo-shop-list");
    const detail = document.getElementById("mmo-shop-detail");
    const scoreEl = document.getElementById("mmo-score-shop");
    if (!list || !detail) return;
    list.innerHTML = "";
    SHOP_ITEMS.forEach(item => {
        const card = document.createElement("button");
        card.className = "mmo-shop-card";
        card.textContent = item.name;
        card.dataset.id = item.id;
        card.addEventListener("click", () => showShopDetail(item, detail));
        list.appendChild(card);
    });
    if (scoreEl) scoreEl.textContent = `积分：${state.score || 0}`;
}

function showShopDetail(item, detail) {
    detail.innerHTML = `
        <div class="mmo-shop-title">${item.name}</div>
        <div class="mmo-shop-price">${item.price} ${CURRENCY_NAME}</div>
        <button class="ui-btn ui-primary" data-buy="${item.id}">购买</button>
        <div class="mmo-shop-note">购买计入积分：+${item.score}</div>
    `;
    const btn = detail.querySelector("[data-buy]");
    btn?.addEventListener("click", () => handlePurchase(item));
}

function handlePurchase(item) {
    if ((state.coins || 0) < item.price) {
        toast("灵玉不足，需充值或抽卡补充。");
        return;
    }
    state.coins -= item.price;
    addScore(item.score);
    if (!state.ownedSetIds.includes(item.id)) {
        state.ownedSetIds.push(item.id);
    }
    state.bag.push({ name: item.name, rarity: "套装" });
    saveState();
    renderCurrency();
    renderShop();
    renderBag();
    renderLeaderboard();
    toast("购买成功，已加入背包。");
}

function bindGacha(page) {
    const actions = page.querySelector(".mmo-gacha-actions");
    actions?.querySelectorAll("button[data-pulls]").forEach(btn => {
        btn.addEventListener("click", () => {
            const pulls = Number(btn.dataset.pulls || "1");
            runGacha(pulls);
        });
    });
    renderGachaHeader();
}

function renderGachaHeader() {
    const pityEl = document.getElementById("mmo-pity");
    if (pityEl) pityEl.textContent = `距保底：${Math.max(0, 150 - (state.pity || 0))} 抽`;
    renderCurrency();
}

function runGacha(pulls) {
    const totalCost = pulls * GACHA_COST;
    if ((state.coins || 0) < totalCost) {
        toast("灵玉不足，先去充值或购买。");
        return;
    }
    state.coins -= totalCost;
    const results = [];
    for (let i = 0; i < pulls; i++) {
        const rarity = rollRarity();
        const name = rollItemName(rarity);
        results.push({ rarity, name });
        if (rarity === "gold") {
            state.pity = 0;
            addScore(2000);
        } else {
            state.pity += 1;
        }
    }
    saveState();
    renderCurrency();
    renderGachaHeader();
    renderBag();
    renderLeaderboard();
    renderGachaResults(results);
}

function rollRarity() {
    const pity = state.pity || 0;
    if (pity >= 150) return "gold";
    let goldProb = 0.0085;
    if (pity >= 140) goldProb = 0.015;
    else if (pity >= 130) goldProb = 0.01;
    const rand = Math.random();
    if (rand < goldProb) return "gold";
    if (rand < goldProb + 0.16) return "purple";
    return "blue";
}

function rollItemName(rarity) {
    const gold = ["龙鳞佩", "幽兰剑心", "九霄琴匣", "落霞金铃"];
    const purple = ["青冥碎片", "紫烟羽", "寒溪竹叶", "暮雨琴弦"];
    const blue = ["竹叶青晶", "微光羽片", "松间石", "云雾砂"];
    const pool = rarity === "gold" ? gold : rarity === "purple" ? purple : blue;
    const name = pool[Math.floor(Math.random() * pool.length)];
    state.bag.push({ name: `${rarityLabel(rarity)}·${name}`, rarity });
    saveState();
    return `${rarityLabel(rarity)}·${name}`;
}

function rarityLabel(rarity) {
    if (rarity === "gold") return "金";
    if (rarity === "purple") return "紫";
    return "蓝";
}

function renderGachaResults(results) {
    const wrap = document.getElementById("mmo-gacha-results");
    if (!wrap) return;
    wrap.innerHTML = "";
    results.forEach(r => {
        const cell = document.createElement("div");
        cell.className = `mmo-crystal ${r.rarity}`;
        cell.textContent = r.name;
        wrap.appendChild(cell);
    });
}

function renderBag() {
    const list = document.getElementById("mmo-bag-list");
    if (!list) return;
    list.innerHTML = "";
    if (!state.bag.length) {
        list.innerHTML = `<div class="mmo-placeholder">背包空空，如风过竹林。</div>`;
        return;
    }
    state.bag.slice(-100).reverse().forEach(item => {
        const row = document.createElement("div");
        row.className = `mmo-bag-row ${item.rarity || "common"}`;
        row.innerHTML = `<span>${item.name}</span><em>${item.rarity || ""}</em>`;
        list.appendChild(row);
    });
}

function renderRecharge() {
    const wrap = document.getElementById("mmo-recharge-cards");
    if (!wrap) return;
    wrap.innerHTML = "";
    RECHARGE_TIERS.forEach(price => {
        const card = document.createElement("div");
        card.className = "mmo-recharge-card";
        card.innerHTML = `
            <div class="recharge-amount">${price * 10} ${CURRENCY_NAME}</div>
            <div class="recharge-price">¥${price}</div>
        `;
        card.addEventListener("click", () => handleRecharge(price));
        wrap.appendChild(card);
    });
}

function handleRecharge(price) {
    const wallet = getState("phone.wallet") || { balance: 0, events: [] };
    const balance = wallet.balance ?? 0;
    if (balance < price) {
        toast("微信余额不足。");
        return;
    }
    const nextBalance = balance - price;
    const events = [{ type: "expense", amount: price, source: "充值武侠游戏", time: Date.now() }, ...(wallet.events || [])].slice(0, 20);
    updateState("phone.wallet", { ...wallet, balance: nextBalance, events });
    addCoins(price * 10);
    toast(`充值成功，获得 ${price * 10} ${CURRENCY_NAME}`);
    showPhoneFloatingAlert?.("充值武侠游戏");
}

function renderLeaderboard() {
    const list = document.getElementById("mmo-leader-list");
    const playerRank = document.getElementById("mmo-player-rank");
    const scoreEl = document.getElementById("mmo-score-rank");
    if (!list || !playerRank) return;
    const entries = [...(state.leaderboard || [])];
    entries.sort((a, b) => b.score - a.score);
    const player = { name: ensureLoginAvatar(), score: state.score || 0 };
    let playerPosition = entries.findIndex(e => player.score >= e.score) + 1;
    list.innerHTML = "";
    entries.slice(0, 50).forEach((e, idx) => {
        const row = document.createElement("div");
        row.className = "mmo-rank-row";
        row.innerHTML = `<span class="rank-no">${idx + 1}</span><span class="rank-name">${e.name}</span><span class="rank-score">${e.score}</span>`;
        list.appendChild(row);
    });
    if (playerPosition === 0 || playerPosition > 50) {
        playerRank.textContent = `你的积分：${player.score}（未进入排名）`;
    } else {
        playerRank.textContent = `你的排名：${playerPosition} 名 · 积分 ${player.score}`;
    }
    if (scoreEl) scoreEl.textContent = `积分：${state.score || 0}`;
}

function toast(text) {
    const existing = document.getElementById("mmo-toast");
    const container = existing || document.createElement("div");
    container.id = "mmo-toast";
    container.className = "mmo-toast";
    container.textContent = text;
    if (!existing) document.body.appendChild(container);
    container.classList.add("show");
    setTimeout(() => container.classList.remove("show"), 1600);
}

function paintParticles() {
    const canvas = document.getElementById("mmo-particles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const particles = Array.from({ length: 32 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 1 + Math.random() * 2,
        s: 0.0006 + Math.random() * 0.001
    }));
    const resize = () => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y += p.s * canvas.height;
            if (p.y > 1) {
                p.y = 0;
                p.x = Math.random();
            }
            ctx.fillStyle = "rgba(200,255,200,0.6)";
            ctx.beginPath();
            ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(tick);
    };
    tick();
}

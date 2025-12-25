import {
    listCharacterCards,
    getActiveCard,
    setActiveCard,
    upsertCharacterCard,
    deleteCharacterCard,
    GENERIC_OPENER,
    GENERIC_BIO
} from "../data/character-cards.js";
import { saveSlot, loadSlot, deleteSlot, listSlots, renameSlot } from "../data/save-slots.js";
import { peekRoleTemp, clearRoleTemp, loadRoleTemp } from "../data/role-temp.js";

const SHEET_POSITIONS = ["fullscreen", "top", "bottom"];
const PREF_KEY = "yuan-phone:character-sheet:prefs";

function normalizePos(pos) {
    return SHEET_POSITIONS.includes(pos) ? pos : "bottom";
}

function normalizeTab(tab) {
    if (tab === "about" || tab === "edit") return tab;
    if (tab === "card" || tab === "rules" || tab === "settings") return "edit";
    return "about";
}

function readPrefs() {
    if (typeof window === "undefined" || !window.localStorage) return {};
    try {
        const raw = window.localStorage.getItem(PREF_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writePrefs(next = {}) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        const prev = readPrefs();
        window.localStorage.setItem(PREF_KEY, JSON.stringify({ ...prev, ...next }));
    } catch {
        // ignore persistence errors
    }
}

export function initCharacterProfile(triggerEl, sheetEl, options = {}) {
    if (!triggerEl || !sheetEl) return { refresh: () => {} };
    const inner = sheetEl.querySelector(".sheet-inner") || sheetEl;
    sheetEl.classList.add("character-sheet");
    const closeBtn = sheetEl.querySelector("#character-sheet-close");
    const prefs = readPrefs();
    if (prefs.pos) sheetEl.dataset.pos = normalizePos(prefs.pos);
    if (prefs.tab) sheetEl.dataset.tab = prefs.tab;

    function renderSheet() {
        const cards = listCharacterCards();
        const active = getActiveCard();
        const editId = sheetEl.dataset.editId || active.id;
        const editing = cards.find(c => c.id === editId) || active;
        const slots = listSlots(editing.id);
        const tempSlot = peekRoleTemp();
        const rawTab = sheetEl.dataset.tab || prefs.tab || "about";
        const activeTab = normalizeTab(rawTab);
        const pos = normalizePos(sheetEl.dataset.pos || prefs.pos || "bottom");
        const confirmMode = sheetEl.dataset.confirmMode || "";
        const confirmText = confirmMode === "delete" ? "删除当前角色？此操作不可撤销。" : "";
        sheetEl.dataset.pos = pos;
        sheetEl.dataset.tab = activeTab;
        sheetEl.dataset.editId = editing.id;
        writePrefs({ pos, tab: activeTab });
        const headline = editing.bio || editing.persona || "写下简介、语气或开场感觉。";
        const safeHeadline = escapeHtml(headline);
        const displayName = escapeHtml(editing.name || "未命名角色");
        const activeName = escapeHtml(active.name || "角色");
        inner.innerHTML = `
            <div class="sheet-head combined">
                <div class="sheet-head-left">
                    <p class="sheet-kicker">角色档案</p>
                    <h3>${displayName}</h3>
                    <p class="sheet-tagline">${safeHeadline}</p>
                </div>
                <div class="sheet-head-right">
                    <button type="button" data-action="edit-active" class="ghost">当前：${activeName}</button>
                    <button id="character-sheet-close" type="button" aria-label="关闭">✕</button>
                </div>
            </div>
            <div class="sheet-tabs">
                <button class="tab-btn ${activeTab === "about" ? "active" : ""}" data-tab="about">简介</button>
                <button class="tab-btn ${activeTab === "edit" ? "active" : ""}" data-tab="edit">编辑</button>
            </div>
            <div class="sheet-body" data-active-tab="${activeTab}">
                ${renderSection(cards, active, editing, slots, tempSlot, activeTab, { confirmMode })}
            </div>
            ${confirmMode ? renderConfirmOverlay(confirmMode, confirmText) : ""}
        `;
        wireInteractions(inner, active, editing);
    }

    function renderSection(cards, active, editing, slots, tempSlot, tab, confirmState) {
        const dynamicList = Array.isArray(editing.dynamic) ? editing.dynamic.filter(Boolean) : [];
        const personaText = editing.persona || "用一句话写下他的语气、危险感或温度。";
        const worldText = editing.worldLore || "补充他的舞台、势力或环境。";
        const rulesText = editing.rules || "";
        const bioText = editing.bio || "这一段是简介";
        const openerText = editing.opener || GENERIC_OPENER;

        if (tab === "edit") {
            return `
                <div class="sheet-grid edit-grid">
                    <div class="info-card">
                        <div class="card-head">基础</div>
                        <div class="card-form grid-two slim">
                            <label>角色名称
                                <input type="text" data-field="name" value="${editing.name || ""}" placeholder="写下角色名或称呼">
                            </label>
                            <label>简介
                                <input type="text" data-field="bio" value="${bioText}" placeholder="这一段是简介">
                            </label>
                            <label>开场白
                                <textarea data-field="opener" rows="3" placeholder="这是默认开场白">${openerText}</textarea>
                            </label>
                            <label>Persona / 语气
                                <textarea data-field="persona" rows="3" placeholder="压迫、温柔、节奏、口癖">${personaText}</textarea>
                            </label>
                            <label>世界观 / 舞台
                                <textarea data-field="worldLore" rows="3" placeholder="背景、势力、环境、关系网">${worldText}</textarea>
                            </label>
                        </div>
                    </div>
                    <div class="info-card">
                        <div class="card-head">规则</div>
                        <div class="card-form slim">
                            <label>固定规则
                                <textarea data-field="rules" rows="4" placeholder="格式、禁忌、回应方式">${rulesText}</textarea>
                            </label>
                            <label>动态规则
                                <textarea data-field="dynamic" rows="5" placeholder="每行一条，会随剧情更新">${dynamicList.join("\n")}</textarea>
                            </label>
                            <div class="quick-dynamic">
                                <input type="text" data-quick-dynamic placeholder="追加临时规则，例如：不要安慰，只下命令">
                                <button class="ghost" data-action="add-dynamic">追加</button>
                            </div>
                            <div class="rule-hint">动态规则会和当前角色卡一起存档，无需单独保存。</div>
                            <div class="card-actions inline">
                                <button class="primary" data-action="save">保存</button>
                                <button class="ghost ${confirmState.confirmMode === "delete" ? "confirming" : ""}" data-action="delete" data-confirm="true" ${editing.id === "default" ? "disabled" : ""}>
                                    ${confirmState.confirmMode === "delete" ? "确认删除" : "删除角色"}
                                </button>
                            </div>
                            ${confirmState.confirmMode === "delete" ? buildConfirmRow(confirmState.confirmMode) : ""}
                        </div>
                    </div>
                    ${renderSlotGrid(slots, tempSlot, editing.id)}
                    <div class="info-card soft settings-card">
                        <div class="card-head">浮层位置</div>
                        <p class="card-note">全屏撑满（除标题/输入区），或置顶/底部悬浮。</p>
                        <div class="pos-grid">
                            ${SHEET_POSITIONS.map(pos => `
                                <button data-pos="${pos}" class="pos-btn ${sheetEl.dataset.pos === pos ? "active" : ""}">${labelPos(pos)}</button>
                            `).join("")}
                        </div>
                    </div>
                </div>
            `;
        }
        return `
            <div class="sheet-hero about-hero">
                <div class="hero-primary">
                    <div class="pill-row">
                        <span class="pill accent">简介</span>
                        <span class="pill ghost">更新 ${formatTime(editing.updatedAt)}</span>
                        <span class="pill ghost">${dynamicList.length ? `动态规则 × ${dynamicList.length}` : "等待动态更新"}</span>
                        ${editing.id === active.id ? `<span class="pill thin">当前使用中</span>` : ""}
                    </div>
                    <h4 class="hero-name">${escapeHtml(editing.name || "未命名角色")}</h4>
                    <p class="hero-lead">${renderLines(bioText, "这一段是简介")}</p>
                    <div class="opener-block">
                        <div class="opener-label">开场白</div>
                        <p class="opener-text">${renderOpener(openerText)}</p>
                    </div>
                    <div class="meta-grid">
                        <div class="meta-card">
                            <div class="meta-head">Persona</div>
                            <p>${renderLines(personaText)}</p>
                        </div>
                        <div class="meta-card">
                            <div class="meta-head">世界观</div>
                            <p>${renderLines(worldText)}</p>
                        </div>
                        <div class="meta-card">
                            <div class="meta-head">规则</div>
                            <p>${renderLines(rulesText, "写下回应格式、禁忌或节奏提示")}</p>
                        </div>
                    </div>
                    <div class="pill-row wrap">
                        ${dynamicList.length
                            ? dynamicList.map(rule => `<span class="pill thin">${escapeHtml(rule)}</span>`).join("")
                            : `<span class="pill ghost">用「追加」记录临时规则或情绪</span>`
                        }
                    </div>
                </div>
                <div class="hero-secondary">
                    <div class="info-card soft">
                        <div class="card-head">角色卡</div>
                        <div class="card-list tight">
                            ${cards.map(card => `
                                <button class="card-chip ${card.id === editing.id ? "active" : ""}" data-card="${card.id}">
                                    <span class="card-name">${escapeHtml(card.name || "未命名")}</span>
                                    ${card.id === active.id ? `<span class="pill thin">当前</span>` : ""}
                                    ${tempSlot && tempSlot.roleId === card.id ? `<span class="pill thin">暂存</span>` : ""}
                                </button>
                            `).join("")}
                            <button class="card-chip ghost" data-card="__new">+ 新建</button>
                        </div>
                        <div class="card-actions inline">
                            <button class="primary switch-btn" data-action="switch" ${editing.id === active.id ? "disabled" : ""}>切换到此角色</button>
                            ${editing.id === active.id ? `<span class="pill thin">已在使用</span>` : ""}
                        </div>
                    </div>
                    <div class="info-card soft slot-summary">
                        <div class="card-head">存档概览</div>
                        <div class="slot-mini-list">
                            ${slots.map(slot => renderSlotSummary(slot)).join("")}
                        </div>
                        <p class="card-note small">存档与角色独立，双击槽位重命名</p>
                    </div>
                </div>
            </div>
        `;
    }

    function renderConfirmOverlay(mode, text) {
        return `
            <div class="card-confirm-overlay">
                <div class="card-confirm-modal">
                    <p>${text}</p>
                    <div class="confirm-actions">
                        <button data-confirm-yes="${mode}">确认</button>
                        <button data-confirm-cancel>取消</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderSlotGrid(slots, tempSlot, editingId) {
        return `
            <div class="slot-panel compact edit-panel">
                <div class="slot-head">
                    <span>存档槽位（与角色绑定）</span>
                    <span class="slot-hint">双击卡片可重命名</span>
                </div>
                <div class="slot-grid">
                    ${slots.map(slot => renderSlotCard(slot)).join("")}
                    ${tempSlot ? renderTempSlot(tempSlot, editingId) : ""}
                </div>
            </div>
        `;
    }

    function renderSlotCard(slot) {
        const name = slot.slotName || `槽位 ${slot.index}`;
        const safeName = escapeHtml(name);
        const turns = typeof slot.turns === "number" ? slot.turns : 0;
        return `
            <div class="slot-card ${slot.empty ? "empty" : ""}" data-slot="${slot.index}" data-slot-name="${escapeAttr(name)}" title="双击重命名槽位">
                <div class="slot-title">${safeName}</div>
                <div class="slot-meta">${slot.empty ? "空" : `更新于 ${formatTime(slot.savedAt)}`}</div>
                <div class="slot-meta subtle">${slot.empty ? "尚未保存" : `对话回合 ${turns}`}</div>
                <div class="slot-actions">
                    <button data-slot-act="save" data-slot="${slot.index}">保存</button>
                    <button data-slot-act="load" data-slot="${slot.index}" ${slot.empty ? "disabled" : ""}>读取</button>
                    <button data-slot-act="delete" data-slot="${slot.index}" ${slot.empty ? "disabled" : ""} data-confirm="true">清空</button>
                </div>
            </div>
        `;
    }

    function renderTempSlot(tempSlot, editingId) {
        const disabled = editingId !== tempSlot.roleId ? "disabled" : "";
        return `
            <div class="slot-card temp" data-slot="4" data-temp-slot="true">
                <div class="slot-title">槽位 4 · 暂存</div>
                <div class="slot-meta">${tempSlot.roleName ? tempSlot.roleName : tempSlot.roleId}</div>
                <div class="slot-meta">更新于 ${formatTime(tempSlot.savedAt)}</div>
                <div class="slot-actions">
                    <button data-temp-load ${disabled}>恢复</button>
                    <button data-temp-clear>清空</button>
                </div>
                ${editingId !== tempSlot.roleId ? `<div class="slot-meta">切回 ${tempSlot.roleName || "该角色"} 后可恢复</div>` : ""}
            </div>
        `;
    }

    function renderSlotSummary(slot) {
        const name = slot.slotName || `槽位 ${slot.index}`;
        const safeName = escapeHtml(name);
        const turns = typeof slot.turns === "number" ? slot.turns : 0;
        if (slot.empty) {
            return `<div class="slot-mini empty"><span>${safeName}</span><span class="slot-meta">空</span></div>`;
        }
        return `<div class="slot-mini"><span>${safeName}</span><span class="slot-meta">${formatTime(slot.savedAt)} · 回合 ${turns}</span></div>`;
    }

    function buildConfirmRow(mode) {
        const text = mode === "delete" ? "删除该角色？" : "保存当前修改？";
        return `
            <div class="card-confirm" data-confirm-row="${mode}">
                <span>${text}</span>
                <div class="confirm-actions">
                    <button data-confirm-yes="${mode}">确认</button>
                    <button data-confirm-cancel>取消</button>
                </div>
            </div>
        `;
    }

    function escapeHtml(str = "") {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function escapeAttr(str = "") {
        return escapeHtml(str).replace(/"/g, "&quot;");
    }

    function renderOpener(text = "") {
        return escapeHtml(text || GENERIC_OPENER).replace(/\n/g, "<br>");
    }

    function renderLines(text = "", fallback = "") {
        return escapeHtml(text || fallback).replace(/\n/g, "<br>");
    }

    function wireInteractions(root, active, editing) {
        root.querySelectorAll(".card-chip").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.card;
                let nextId = id;
                if (id === "__new") {
                    const card = upsertCharacterCard({
                        id: `card-${Date.now()}`,
                        name: "新角色",
                        worldLore: "",
                        persona: "",
                        rules: "",
                        dynamic: [],
                        bio: GENERIC_BIO,
                        opener: GENERIC_OPENER
                    });
                    nextId = card.id;
                }
                sheetEl.dataset.editId = nextId;
                sheetEl.dataset.confirmMode = "";
                renderSheet();
            });
        });

        root.querySelectorAll(".tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const tab = btn.dataset.tab;
                sheetEl.dataset.tab = tab;
                sheetEl.dataset.confirmMode = "";
                writePrefs({ tab });
                renderSheet();
            });
        });
        root.querySelectorAll(".pos-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const pos = btn.dataset.pos;
                sheetEl.dataset.pos = normalizePos(pos);
                writePrefs({ pos: sheetEl.dataset.pos });
                renderSheet();
            });
        });

        const switchBtn = root.querySelector("[data-action='switch']");
        switchBtn?.addEventListener("click", () => {
            if (editing.id === active.id) return;
            const prev = active.id;
            setActiveCard(editing.id);
            options.onRoleChange?.(prev, editing.id);
            options.onRoleUpdate?.(getActiveCard());
            sheetEl.dataset.editId = editing.id;
            renderSheet();
        });

        const saveBtn = root.querySelector("[data-action='save']");
        saveBtn?.addEventListener("click", () => {
            const payload = collectForm(root);
            upsertCharacterCard({ ...editing, ...payload });
            if (editing.id === active.id) {
                options.onRoleUpdate?.(getActiveCard());
            }
            sheetEl.dataset.confirmMode = "";
            renderSheet();
        });
        const addDynamicBtn = root.querySelector("[data-action='add-dynamic']");
        const quickDynamic = root.querySelector("[data-quick-dynamic]");
        const appendDynamic = () => {
            const text = quickDynamic?.value?.trim();
            if (!text) return;
            const next = Array.isArray(editing.dynamic) ? editing.dynamic.slice() : [];
            next.push(text);
            upsertCharacterCard({ ...editing, dynamic: next });
            quickDynamic.value = "";
            renderSheet();
        };
        addDynamicBtn?.addEventListener("click", appendDynamic);
        quickDynamic?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                appendDynamic();
            }
        });
        const delBtn = root.querySelector("[data-action='delete']");
        delBtn?.addEventListener("click", () => {
            if (editing.id === "default") return;
            sheetEl.dataset.confirmMode = sheetEl.dataset.confirmMode === "delete" ? "" : "delete";
            renderSheet();
        });

        root.querySelector("[data-action='edit-active']")?.addEventListener("click", () => {
            sheetEl.dataset.editId = getActiveCard().id;
            sheetEl.dataset.confirmMode = "";
            renderSheet();
        });

        sheetEl.querySelectorAll("[data-confirm-yes]").forEach(btn => {
            btn.addEventListener("click", () => {
                const mode = btn.dataset.confirmYes;
                const prevId = active.id;
                if (mode === "delete" && editing.id !== "default") {
                    deleteCharacterCard(editing.id);
                    const nextActive = getActiveCard().id;
                    sheetEl.dataset.editId = nextActive;
                    if (prevId !== nextActive) {
                        options.onRoleChange?.(prevId, nextActive);
                    }
                    options.onRoleUpdate?.(getActiveCard());
                }
                sheetEl.dataset.confirmMode = "";
                renderSheet();
            });
        });
        sheetEl.querySelector("[data-confirm-cancel]")?.addEventListener("click", () => {
            sheetEl.dataset.confirmMode = "";
            renderSheet();
        });
        const close = root.querySelector("#character-sheet-close");
        close?.addEventListener("click", hide);

        root.querySelectorAll("[data-slot-act]").forEach(btn => {
            btn.addEventListener("click", () => {
                const act = btn.dataset.slotAct;
                const idx = Number(btn.dataset.slot);
                if (!idx) return;
                if (act === "save") saveSlot(idx, editing.id);
                if (act === "load") {
                    loadSlot(idx, editing.id);
                    sheetEl.dataset.editId = getActiveCard().id;
                    options.onRoleUpdate?.(getActiveCard());
                }
                if (act === "delete") {
                    if (btn.dataset.confirmState === "on") {
                        btn.dataset.confirmState = "";
                        deleteSlot(idx, editing.id);
                    } else {
                        btn.dataset.confirmState = "on";
                        btn.textContent = "确认清空";
                        setTimeout(() => {
                            btn.dataset.confirmState = "";
                            btn.textContent = "清空";
                        }, 2200);
                        return;
                    }
                }
                renderSheet();
            });
        });

        root.querySelectorAll(".slot-card[data-slot]").forEach(card => {
            card.addEventListener("dblclick", (ev) => {
                if (ev.target.closest(".slot-actions")) return;
                if (card.dataset.tempSlot === "true" || card.classList.contains("empty")) return;
                const idx = Number(card.dataset.slot);
                if (!idx) return;
                const currentName = card.dataset.slotName || `槽位 ${idx}`;
                const nextName = window.prompt("重命名槽位", currentName);
                if (nextName == null) return;
                renameSlot(idx, nextName, editing.id);
                renderSheet();
            });
        });

        root.querySelector("[data-temp-load]")?.addEventListener("click", () => {
            const restored = loadRoleTemp(editing.id);
            if (restored) {
                sheetEl.dataset.editId = editing.id;
                options.onRoleChange?.(active.id, editing.id);
                options.onRoleUpdate?.(getActiveCard());
                try {
                    window.dispatchEvent(new CustomEvent("role:restored"));
                } catch {
                    // ignore
                }
                renderSheet();
            }
        });
        root.querySelector("[data-temp-clear]")?.addEventListener("click", () => {
            clearRoleTemp();
            renderSheet();
        });
    }

    function collectForm(root) {
        const fields = {};
        root.querySelectorAll("[data-field]").forEach(el => {
            const key = el.dataset.field;
            if (key === "dynamic") {
                fields.dynamic = (el.value || "").split("\n").map(s => s.trim()).filter(Boolean);
            } else {
                fields[key] = el.value;
            }
        });
        return fields;
    }

    function updateSheetBounds() {
        const header = document.getElementById("story-header");
        const footer = document.getElementById("story-input-row");
        const top = header ? header.getBoundingClientRect().bottom + 8 : 12;
        const bottom = footer ? Math.max(12, window.innerHeight - footer.getBoundingClientRect().top + 12) : 12;
        sheetEl.style.setProperty("--sheet-top", `${Math.max(8, top)}px`);
        sheetEl.style.setProperty("--sheet-bottom", `${Math.max(10, bottom)}px`);
    }

    function labelPos(pos) {
        if (pos === "fullscreen") return "全屏";
        if (pos === "top") return "置顶";
        return "底部";
    }

    function formatTime(ts) {
        if (!ts) return "未知时间";
        const d = new Date(ts);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    }

    function show() {
        sheetEl.dataset.pos = normalizePos(sheetEl.dataset.pos || prefs.pos || "bottom");
        sheetEl.dataset.tab = normalizeTab(sheetEl.dataset.tab || prefs.tab || "about");
        sheetEl.dataset.editId = sheetEl.dataset.editId || getActiveCard().id;
        sheetEl.removeAttribute("aria-hidden");
        sheetEl.classList.add("open", "show");
        updateSheetBounds();
        renderSheet();
    }
    function hide() {
        sheetEl.setAttribute("aria-hidden", "true");
        sheetEl.classList.remove("open", "show");
        sheetEl.dataset.confirmMode = "";
    }

    triggerEl.addEventListener("dblclick", () => {
        if (sheetEl.classList.contains("open")) hide();
        else show();
    });
    closeBtn?.addEventListener("click", hide);

    const storyPanel = document.getElementById("story-panel");
    storyPanel?.addEventListener("click", (ev) => {
        if (!sheetEl.classList.contains("open")) return;
        if (ev.target.closest("#character-sheet")) return;
        if (ev.target.closest("#story-header")) return;
        if (ev.target.closest("#story-input-row")) return;
        if (ev.target.closest(".story-tools-menu")) return;
        if (ev.target.closest(".story-bubble")) return;
        hide();
    }, true);

    window.addEventListener("resize", updateSheetBounds);
    window.addEventListener("orientationchange", updateSheetBounds);

    return { refresh: renderSheet, show, hide };
}

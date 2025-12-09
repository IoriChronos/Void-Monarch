let dynamicIsland = null;
let dynamicIslandContent = null;
let dynamicIslandLabel = "···";
let islandClickBound = false;

function ensureIslandElements() {
    if (!dynamicIsland) {
        dynamicIsland = document.getElementById("dynamic-island");
        dynamicIslandContent = dynamicIsland ? dynamicIsland.querySelector('.island-content') : null;
        if (dynamicIslandContent) {
            dynamicIslandLabel = dynamicIslandContent.textContent || "···";
        }
    }
    if (dynamicIsland && !islandClickBound) {
        dynamicIsland.addEventListener("click", () => {
            dynamicIsland.classList.toggle("expanded");
        });
        islandClickBound = true;
    }
}

function setIslandLabel(text) {
    ensureIslandElements();
    dynamicIslandLabel = text || "···";
    if (dynamicIsland && dynamicIslandContent && !dynamicIsland.classList.contains("notify")) {
        dynamicIslandContent.textContent = dynamicIslandLabel;
    }
}

function triggerIslandUnlock() {
    ensureIslandElements();
    if (!dynamicIsland) return;
    dynamicIsland.classList.add("unlocking");
    setTimeout(() => {
        dynamicIsland.classList.remove("unlocking");
        dynamicIsland.style.width = "";
        dynamicIsland.style.height = "";
        if (dynamicIslandContent) dynamicIslandContent.textContent = dynamicIslandLabel;
    }, 820);
}

function triggerIslandNotify(msg) {
    ensureIslandElements();
    if (!dynamicIsland) return;
    if (dynamicIslandContent && msg) dynamicIslandContent.textContent = msg;
    dynamicIsland.classList.add("notify");
    setTimeout(() => {
        dynamicIsland.classList.remove("notify");
        if (dynamicIslandContent) dynamicIslandContent.textContent = dynamicIslandLabel;
    }, 1500);
}

const memoState = {
    max: 50,
    items: [],
    listEl: null,
};

function formatMemoTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function renderMemoLog() {
    if (!memoState.listEl) return;
    memoState.listEl.innerHTML = "";
    memoState.items.forEach(item => {
        const row = document.createElement("div");
        row.className = "memo-item";
        const span = document.createElement("span");
        span.textContent = formatMemoTime(item.time);
        const text = document.createElement("div");
        text.textContent = item.text;
        row.appendChild(span);
        row.appendChild(text);
        memoState.listEl.appendChild(row);
    });
}

function addMemoEntry(text) {
    if (!text) return;
    memoState.items.unshift({ text, time: new Date() });
    if (memoState.items.length > memoState.max) {
        memoState.items.pop();
    }
    renderMemoLog();
}

function clearMemoEntries() {
    memoState.items = [];
    renderMemoLog();
}

const callOverlayState = {
    container: null,
    nameEl: null,
    statusEl: null,
    timerEl: null,
    endBtn: null,
    timerId: null,
    startTime: 0,
    activeName: "",
    direction: "",
    previousLabel: "",
};

let islandCallState = null;
let callRetryTimeout = null;

function ensureCallOverlayElements() {
    if (!callOverlayState.container) {
        callOverlayState.container = document.getElementById("in-call-overlay");
        callOverlayState.nameEl = document.getElementById("in-call-name");
        callOverlayState.statusEl = document.getElementById("in-call-status");
        callOverlayState.timerEl = document.getElementById("in-call-timer");
        callOverlayState.endBtn = document.getElementById("in-call-end");
        if (callOverlayState.endBtn) {
            callOverlayState.endBtn.addEventListener("click", () => {
                endCallSession("挂断");
            });
        }
    }
}

function updateCallTimerDisplay() {
    if (!callOverlayState.timerEl || !callOverlayState.startTime) return;
    const elapsed = Math.floor((Date.now() - callOverlayState.startTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    callOverlayState.timerEl.textContent = `${mm}:${ss}`;
}

function startCallSession(name, direction = "incoming") {
    ensureCallOverlayElements();
    hideIslandCallAlert();
    if (!callOverlayState.container) return;
    callOverlayState.previousLabel = dynamicIslandLabel;
    callOverlayState.activeName = name;
    callOverlayState.direction = direction;
    if (callOverlayState.nameEl) callOverlayState.nameEl.textContent = name;
    if (callOverlayState.statusEl) {
        callOverlayState.statusEl.textContent = direction === "incoming" ? "来电 · 通话中" : "呼出 · 通话中";
    }
    callOverlayState.container.classList.add("show");
    callOverlayState.startTime = Date.now();
    updateCallTimerDisplay();
    if (callOverlayState.timerId) clearInterval(callOverlayState.timerId);
    callOverlayState.timerId = setInterval(updateCallTimerDisplay, 1000);
    setIslandLabel(`${name} · 通话中`);
}

function endCallSession(reason = "结束通话") {
    ensureCallOverlayElements();
    if (!callOverlayState.container) return;
    callOverlayState.container.classList.remove("show");
    if (callOverlayState.timerId) {
        clearInterval(callOverlayState.timerId);
        callOverlayState.timerId = null;
    }
    callOverlayState.startTime = 0;
    if (callOverlayState.activeName) {
        addMemoEntry(`${reason} · ${callOverlayState.activeName}`);
    }
    callOverlayState.activeName = "";
    callOverlayState.direction = "";
    const restore = callOverlayState.previousLabel || "Wechat";
    callOverlayState.previousLabel = "";
    setIslandLabel(restore);
}

function showIslandCallAlert(name, { retry = true } = {}) {
    ensureIslandElements();
    const callEl = document.getElementById("island-call");
    const nameEl = document.getElementById("island-call-name");
    if (nameEl) nameEl.textContent = name;
    if (dynamicIsland) dynamicIsland.classList.add("call-alert");
    if (callEl) callEl.setAttribute("aria-hidden", "false");
    islandCallState = { name, retry };
    setIslandLabel(name);
}

function hideIslandCallAlert() {
    ensureIslandElements();
    const callEl = document.getElementById("island-call");
    if (dynamicIsland) dynamicIsland.classList.remove("call-alert");
    if (callEl) callEl.setAttribute("aria-hidden", "true");
    islandCallState = null;
    if (callRetryTimeout) {
        clearTimeout(callRetryTimeout);
        callRetryTimeout = null;
    }
}

function handleIslandCallAction(action) {
    if (!islandCallState) return;
    const name = islandCallState.name;
    if (action === "accept") {
        addMemoEntry(`接听来电 ← ${name}`);
        startCallSession(name, "incoming");
        islandCallState = null;
    } else if (action === "decline") {
        addMemoEntry(`拒绝来电 ← ${name}`);
        const shouldRetry = islandCallState.retry;
        islandCallState = null;
        hideIslandCallAlert();
        if (shouldRetry) {
            scheduleCallRetry(name);
        }
    }
}

function scheduleCallRetry(name, delay = 3000) {
    if (callRetryTimeout) clearTimeout(callRetryTimeout);
    callRetryTimeout = setTimeout(() => {
        triggerIncomingCall(name, false);
    }, delay);
}

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const appIcons = document.querySelectorAll('.app-icon');
    const memoLogEl = document.getElementById('memo-log');
    const memoClearBtn = document.getElementById('memo-clear');
    memoState.listEl = memoLogEl;
    renderMemoLog();
    if (memoClearBtn) memoClearBtn.addEventListener('click', clearMemoEntries);

    /* --------- 剧情系统：只是本地假对话，之后再换 AI --------- */
    const storyLog = document.getElementById('story-log');
    const storyInput = document.getElementById('story-input');
    const storySend = document.getElementById('story-send');
    const collapseBtn = document.getElementById('input-collapse-btn');

    function limitTwoLines() {
        storyInput.classList.remove("expanded");
        collapseBtn.classList.add("hidden");

        storyInput.style.height = "auto";
        const lineHeight = parseFloat(getComputedStyle(storyInput).lineHeight);
        const twoLineHeight = lineHeight * 2 + 10;
        storyInput.style.height = twoLineHeight + "px";
    }

    function autoGrowInput() {
        storyInput.style.height = "auto";

        const lineHeight = parseFloat(getComputedStyle(storyInput).lineHeight);
        const twoLineHeight = lineHeight * 2 + 10;
        const scrollH = storyInput.scrollHeight;
        const max = window.innerHeight * 0.7;

        if (scrollH <= twoLineHeight + 4) {
            limitTwoLines();
            return;
        }

        storyInput.classList.add("expanded");

        if (scrollH < max) {
            storyInput.style.height = scrollH + "px";
        } else {
            storyInput.style.height = max + "px";
        }
        collapseBtn.classList.remove("hidden");
    }

    storyInput.addEventListener("input", autoGrowInput);

    collapseBtn.addEventListener("click", () => {
        limitTwoLines();
    });

    function appendBubble(text, role) {
        const bubble = document.createElement('div');
        bubble.className = 'story-bubble ' + role;
        bubble.textContent = text;
        storyLog.appendChild(bubble);
        storyLog.scrollTop = storyLog.scrollHeight;
    }

    appendBubble('主线从这里开始。你可以先随便说几句，之后我们再把它接到 AI 上。', 'system');

    function handleSend() {
        const text = storyInput.value.trim();
        if (!text) return;

        appendBubble(text, 'user');
        storyInput.value = '';

        setTimeout(() => {
            appendBubble('【占位回复】暂时只是本地假对话。之后会把这里换成真正的 AI 接口。', 'system');
        }, 300);

        setTimeout(() => limitTwoLines(), 30);
    }

    storySend.addEventListener('click', handleSend);
    storyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    /* --------- 手机内部页面切换 ---------- */
    const homeScreen = document.getElementById('home-screen');
    const appPages = document.querySelectorAll('.app-page');
    const backButtons = document.querySelectorAll('.back-home');

    const APP_LABELS = {
        "wechat-page": "微信",
        "call-page": "电话",
        "darkfog-page": "黑雾",
        "watch-page": "守望",
        "memo-page": "备忘录",
        "heart-page": "心率",
        "settings-page": "设置",
    };

    function recordAppOpen(id) {
        const name = APP_LABELS[id];
        if (name) addMemoEntry(`打开 ${name}`);
    }

    function showHome() {
        appPages.forEach(p => p.style.display = 'none');
        homeScreen.style.display = 'grid';
    }

    function openPage(id) {
        homeScreen.style.display = 'none';
        appPages.forEach(p => {
            if (p.id === id) {
                p.style.display = 'flex';
            } else {
                p.style.display = 'none';
            }
        });
        // 恢复默认滚动顶和顶部状态
        const scroll = document.querySelector(`#${id} .app-scroll`);
        if (scroll) scroll.scrollTop = 0;
        recordAppOpen(id);
    }

    appIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const target = icon.getAttribute('data-target');
            if (!target) return;

            // 启动动画：缩小 + 淡出
            icon.classList.add("launching");

            // 动画结束后打开页面
            setTimeout(() => {
                openPage(target);

                // 恢复 icon，防止第二次点击不再有动画
                icon.classList.remove("launching");

            }, 180); // 对应 CSS 动画时间
        });
    });

    backButtons.forEach(btn => {
        btn.addEventListener('click', showHome);
    });

    const homeBar = document.getElementById("home-bar");
    if (homeBar) {
        homeBar.addEventListener("click", showHome);
        let hbStartY = null;
        let hbTriggered = false;
        homeBar.addEventListener("pointerdown", (e) => {
            hbStartY = e.clientY;
            hbTriggered = false;
        });
        homeBar.addEventListener("pointermove", (e) => {
            if (hbStartY == null || hbTriggered) return;
            if (hbStartY - e.clientY > 24) {
                hbTriggered = true;
                showHome();
            }
        });
        homeBar.addEventListener("pointerup", () => {
            hbStartY = null;
        });
        homeBar.addEventListener("pointercancel", () => {
            hbStartY = null;
        });
    }

    /* --------- 悬浮按钮：拖拽 + 吸附 + 打开手机 ---------- */
    const phoneLayer = document.getElementById('phone-layer');
    const toggleBtn = document.getElementById('phone-toggle');

    let phoneVisible = false;
    let dragging = false;
    let dockSide = 'right';
    let dragStartX = 0;
    let dragStartY = 0;
    let btnStartLeft = 0;
    let btnStartTop = 0;
    let pressStartTime = 0;

    function isMobileMode() {
        return body.classList.contains('mobile-mode');
    }

    function setPhoneVisible(show) {
        phoneVisible = show;
        if (isMobileMode()) {
            if (show) {
                phoneLayer.classList.add('show');
                body.classList.add('phone-open');
                triggerIslandUnlock();
            } else {
                phoneLayer.classList.remove('show');
                body.classList.remove('phone-open');
            }
        } else {
            body.classList.toggle('phone-open', show);
            if (show) triggerIslandUnlock();
        }
    }

    function togglePhone() {
        setPhoneVisible(!phoneVisible);
    }

    function startDrag(clientX, clientY) {
        dragging = false;
        pressStartTime = performance.now();

        const rect = toggleBtn.getBoundingClientRect();
        dragStartX = clientX;
        dragStartY = clientY;
        btnStartLeft = rect.left;
        btnStartTop = rect.top;

        toggleBtn.style.left = rect.left + 'px';
        toggleBtn.style.top = rect.top + 'px';
        toggleBtn.style.right = 'auto';
        toggleBtn.style.bottom = 'auto';

        function onMouseMove(ev) {
            const dx = ev.clientX - dragStartX;
            const dy = ev.clientY - dragStartY;
            const distance = Math.hypot(dx, dy);
            if (!dragging && distance > 4) {
                dragging = true;
            }
            if (!dragging) return;

            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rectNow = toggleBtn.getBoundingClientRect();
            const margin = 8;

            let newLeft = btnStartLeft + dx;
            let newTop = btnStartTop + dy;

            newLeft = Math.max(margin, Math.min(newLeft, vw - rectNow.width - margin));
            newTop = Math.max(margin, Math.min(newTop, vh - rectNow.height - margin));

            toggleBtn.style.left = newLeft + 'px';
            toggleBtn.style.top = newTop + 'px';
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const pressDuration = performance.now() - pressStartTime;

            if (!dragging && pressDuration < 250) {
                togglePhone();
            } else if (dragging) {
                const rectEnd = toggleBtn.getBoundingClientRect();
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const margin = 8;

                const centerX = rectEnd.left + rectEnd.width / 2;
                let finalLeft;

                if (centerX < vw / 2) {
                    dockSide = 'left';
                    finalLeft = margin;
                } else {
                    dockSide = 'right';
                    finalLeft = vw - rectEnd.width - margin;
                }

                let finalTop = rectEnd.top;
                finalTop = Math.max(margin, Math.min(finalTop, vh - rectEnd.height - margin));

                toggleBtn.style.left = finalLeft + 'px';
                toggleBtn.style.top = finalTop + 'px';
            }
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    toggleBtn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        startDrag(startX, startY);
        toggleBtn.setPointerCapture(e.pointerId);

        const moveHandler = (ev) => {
            const fake = { clientX: ev.clientX, clientY: ev.clientY };
            document.dispatchEvent(new MouseEvent('mousemove', fake));
        };
        const upHandler = (ev) => {
            document.removeEventListener('pointermove', moveHandler);
            document.removeEventListener('pointerup', upHandler);
            document.removeEventListener('pointercancel', upHandler);
            toggleBtn.releasePointerCapture(ev.pointerId);
            const fake = { clientX: ev.clientX, clientY: ev.clientY };
            document.dispatchEvent(new MouseEvent('mouseup', fake));
        };
        document.addEventListener('pointermove', moveHandler, { passive: false });
        document.addEventListener('pointerup', upHandler);
        document.addEventListener('pointercancel', upHandler);
    }, { passive: false });

    function repositionToggleOnResize() {
        const rect = toggleBtn.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8;

        let top = rect.top;
        let left;

        if (dockSide === 'left') {
            left = margin;
        } else {
            left = vw - rect.width - margin;
        }

        top = Math.max(margin, Math.min(top, vh - rect.height - margin));

        toggleBtn.style.left = left + 'px';
        toggleBtn.style.top = top + 'px';
        toggleBtn.style.right = 'auto';
        toggleBtn.style.bottom = 'auto';
    }

    window.addEventListener('resize', () => {
        updateLayoutMode();
        repositionToggleOnResize();
    });

    function updateLayoutMode() {
        const vw = window.innerWidth;
        const PHONE_WIDTH = 380;
        const STORY_MIN = 480;
        const GAP = 80;

        if (vw >= PHONE_WIDTH + STORY_MIN + GAP) {
            body.classList.remove('mobile-mode');
            body.classList.add('pc-mode');
            phoneLayer.classList.remove('show');
            body.classList.remove('phone-open');
        } else {
            body.classList.add('mobile-mode');
            body.classList.remove('pc-mode');
            phoneLayer.classList.remove('show');
            body.classList.remove('phone-open');
            phoneVisible = false;
        }
    }

    ensureIslandElements();

    /* ---------- 关键：拖拽排序 ---------- */
    let dragSrc = null;

    appIcons.forEach(icon => {
        icon.setAttribute("draggable", "true");

        icon.addEventListener("dragstart", e => {
            dragSrc = icon;
            e.dataTransfer.effectAllowed = "move";
            icon.classList.add("dragging");
        });

        icon.addEventListener("dragover", e => {
            e.preventDefault();                 // 必须，否则不会触发 drop
            e.dataTransfer.dropEffect = "move";
        });

        icon.addEventListener("drop", () => {
            if (dragSrc && dragSrc !== icon) {
                const parent = icon.parentNode;
                parent.insertBefore(dragSrc, icon);
            }
        });

        icon.addEventListener("dragend", () => {
            icon.classList.remove("dragging");
            dragSrc = null;
        });
    });

    // 初始化布局和悬浮按钮
    updateLayoutMode();
    repositionToggleOnResize();
    setupWeChat();
});

/* 状态栏时间 */
function updateTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const el = document.getElementById("sb-time");
    if (el) el.textContent = `${hh}:${mm}`;
}
setInterval(updateTime, 1000);
updateTime();

/* 电量（浏览器支持时） */
if (navigator.getBattery) {
    navigator.getBattery().then(bat => {
        function updateBattery() {
            const bar = document.getElementById("bat-level");
            if (bar) bar.style.width = (bat.level * 100) + "%";
        }
        updateBattery();
        bat.onlevelchange = updateBattery;
    });
}

/* ---------------------- 微信轻量数据 ---------------------- */
function setupWeChat() {
    const tabs = document.querySelectorAll(".wechat-tabs button");
    const panels = {
        chats: document.getElementById("wechat-chats"),
        moments: document.getElementById("wechat-moments"),
        wallet: document.getElementById("wechat-wallet"),
    };
    const chatWindow = document.getElementById("wechat-chat-window");
    const chatTitle = document.getElementById("wechat-chat-title");
    const chatLog = document.getElementById("wechat-chat-log");
    const chatInput = document.getElementById("wechat-chat-input");
    const chatSend = document.getElementById("wechat-chat-send");
    const chatBack = document.getElementById("chat-back");
    const wechatTop = document.getElementById("wechat-top");
    const wechatBottom = document.getElementById("wechat-bottom");
    const momentsFeed = document.getElementById("wechat-moments-feed");
    const chatActionsToggle = document.getElementById("chat-actions-toggle");
    const chatActionsPanel = document.getElementById("chat-actions-panel");
    const chatActionButtons = document.querySelectorAll("[data-chataction]");
    const chatActionForm = document.getElementById("chat-action-form");
    const chatActionLabel = document.getElementById("chat-action-label");
    const chatActionAmount = document.getElementById("chat-action-amount");
    const chatActionConfirm = document.getElementById("chat-action-confirm");
    const chatActionCancel = document.getElementById("chat-action-cancel");
    const walletAmtEl = document.getElementById("wallet-balance-amt");
    const redEnvelopeOverlay = document.getElementById("red-envelope-overlay");
    const redEnvelopeAmount = document.getElementById("red-envelope-amount");
    const redEnvelopeConfirm = document.getElementById("red-envelope-confirm");
    let walletBalance = 2180.0;
    let pendingRedEnvelope = null;
    let chatActionsOpen = false;
    let currentChatAction = null;
    const ACTION_PRESETS = {
        pay: { type: "pay", label: "转账金额（≤1,000,000）", min: 0.01, max: 1000000, defaultValue: 520.00 },
        red: { type: "red", label: "红包金额（0-200）", min: 0, max: 200, defaultValue: 66.00 },
    };

    const chats = [
        { id: "yuan", name: "元书", preview: "“靠近一点。”", icon: "◻", time: "刚刚", unread: 1, log: [
            { from:"in", text:"零钱到账 ¥1314.00", kind:"pay", amount: 1314.00 },
            { from:"in", text:"“你今天在门口回头三次。”" },
            { from:"out", text:"我只是觉得有人跟着我。" },
            { from:"in", text:"“那就是我。”" },
            { from:"in", text:"红包 ¥6.00", kind:"red", amount: 6.00, redeemed: false },
        ]},
        { id: "room", name: "室友", preview: "电闸修好了。", icon: "▣", time: "下午", unread: 0, log: [
            { from:"in", text:"电闸修好了，你晚点回来吗？" },
        ]},
        { id: "shadow", name: "未知 · 留影", preview: "“他在看你。”", icon: "□", time: "刚刚", unread: 0, log: [
            { from:"in", text:"“他在看你。”" },
        ]},
        { id: "sys", name: "系统通告", preview: "和平协议仍有效", icon: "▢", time: "夜里", unread: 0, log: [
            { from:"in", text:"和平协议仍有效。" },
        ]},
    ];

    const moments = [
        { who: "你", text: "今天只是想确认一件事：你有没有在看我。", time: "刚刚", likes: 23, likedByUser: false },
        { who: "未知信号", text: "今晚的城很安静，像在等一场失控。", time: "1 小时前", likes: 9, likedByUser: false },
        { who: "甜品店老板", text: "提前留了三盒奶油泡芙，希望他别发火。", time: "2 小时前", likes: 12, likedByUser: false },
    ];

    function formatChatText(message) {
        if (!message) return "";
        if (message.text) return message.text;
        if (message.kind === "pay" && message.amount != null) {
            return `转账 ¥${message.amount.toFixed(2)}`;
        }
        if (message.kind === "red" && message.amount != null) {
            return message.redeemed ? `已收红包 ¥${message.amount.toFixed(2)}` : `红包 ¥${message.amount.toFixed(2)}`;
        }
        return "";
    }

    function updateWalletDisplay() {
        if (walletAmtEl) walletAmtEl.textContent = `¥ ${walletBalance.toFixed(2)}`;
    }

    const walletActions = [
        "转账", "收款", "红包", "扫一扫",
        "卡包", "乘车码", "生活缴费", "更多"
    ];

    function totalUnreadCount() {
        return chats.reduce((sum, c) => sum + (c.unread || 0), 0);
    }

    function renderChats() {
        const wrap = panels.chats;
        if (!wrap) return;
        wrap.innerHTML = "";
        chats.forEach(c => {
            const div = document.createElement("div");
            div.className = "wc-item";
            const meta = `
                <div class="wc-meta">
                    ${c.unread ? `<span class="wc-unread">${c.unread}</span>` : ""}
                    <span class="wc-time">${c.time}</span>
                </div>
            `;
            div.innerHTML = `
                <div class="wc-avatar">${c.icon}</div>
                <div class="wc-main">
                    <div class="wc-name">${c.name}</div>
                    <div class="wc-sub">${c.preview}</div>
                </div>
                ${meta}
            `;
            div.addEventListener("click", () => openChat(c.id));
            wrap.appendChild(div);
        });
        const top = document.getElementById("wechat-top");
        const totalUnread = totalUnreadCount();
        if (top) {
            const chatOpen = chatWindow && chatWindow.style.display !== "none";
            if (!chatOpen) top.textContent = `Wechat (${totalUnread})`;
        }
        const chatBadge = document.getElementById("chat-unread-total");
        if (chatBadge) {
            if (totalUnread > 0) {
                chatBadge.textContent = totalUnread;
                chatBadge.style.display = "inline-flex";
            } else {
                chatBadge.style.display = "none";
            }
        }
    }

    function renderMoments() {
        const wrap = momentsFeed;
        if (!wrap) return;
        wrap.innerHTML = "";
        moments.forEach(m => {
            const div = document.createElement("div");
            div.className = "moment-card";
            div.innerHTML = `
                <div class="wc-name">${m.who}</div>
                <div class="wc-sub">${m.text}</div>
                <div class="moment-meta">
                    <span>${m.time}</span>
                    <span>赞 ${m.likes}</span>
                </div>
                <div class="moment-actions">
                    <button class="like" data-act="like">${m.likedByUser ? "取消赞" : "赞一下"}</button>
                    <button>评论</button>
                </div>
            `;
            div.querySelector('[data-act="like"]').addEventListener("click", () => {
                m.likedByUser = !m.likedByUser;
                m.likes = Math.max(0, m.likes + (m.likedByUser ? 1 : -1));
                renderMoments();
            });
            wrap.appendChild(div);
        });
    }

    function renderWallet() {
        const wrap = document.getElementById("wallet-actions");
        if (!wrap) return;
        wrap.innerHTML = "";
        walletActions.forEach(a => {
            const btn = document.createElement("div");
            btn.className = "wallet-btn";
            btn.textContent = a;
            wrap.appendChild(btn);
        });
    }

    function switchTab(target) {
        tabs.forEach(btn => btn.classList.toggle("active", btn.dataset.wtab === target));
        Object.entries(panels).forEach(([key, el]) => {
            if (!el) return;
            if (key === target) {
                el.style.display = key === "moments" ? "flex" : "block";
            } else {
                el.style.display = "none";
            }
        });
        if (chatWindow) chatWindow.style.display = "none";
        if (wechatBottom) wechatBottom.style.display = "grid";
        setChatActions(false);
        hideRedEnvelopeOverlay();
        const unread = totalUnreadCount();
        if (wechatTop) {
            if (target === "chats") wechatTop.textContent = `Wechat (${unread})`;
            else if (target === "moments") wechatTop.textContent = "朋友圈";
            else if (target === "wallet") wechatTop.textContent = "钱包";
        }
        setIslandLabel(target === "chats" ? "Wechat" : (target === "moments" ? "朋友圈" : "钱包"));
    }

    tabs.forEach(btn => {
        btn.addEventListener("click", () => {
            switchTab(btn.dataset.wtab);
        });
    });

    function openChat(id) {
        const c = chats.find(x => x.id === id);
        if (!c || !chatWindow || !chatLog) return;
        c.unread = 0;
        Object.entries(panels).forEach(([, el]) => {
            if (el) el.style.display = "none";
        });
        setChatActions(false);
        hideRedEnvelopeOverlay();
        chatLog.innerHTML = "";
        c.log.forEach(m => {
            const b = document.createElement("div");
            const kind = m.kind ? ` ${m.kind}` : "";
            b.className = "chat-bubble " + (m.from === "in" ? "in" : "out") + kind;
            b.textContent = formatChatText(m);
            const row = document.createElement("div");
            row.className = "chat-row " + (m.from === "in" ? "in" : "out");
            const avatar = document.createElement("div");
            avatar.className = "chat-avatar";
            avatar.textContent = m.from === "in" ? "◻" : "▣";
            row.appendChild(avatar);
            row.appendChild(b);
            if (m.kind === "red" && m.from === "in") {
                b.classList.add("red-bubble-in");
                if (!m.redeemed) {
                    b.classList.add("red-can-open");
                    b.addEventListener("click", () => showRedEnvelopeOverlay(m, id));
                }
            }
            chatLog.appendChild(row);
        });
        chatLog.scrollTop = chatLog.scrollHeight;
        chatWindow.dataset.chat = id;
        chatWindow.style.display = "flex";
        if (wechatBottom) wechatBottom.style.display = "none";
        if (wechatTop && chatTitle) {
            wechatTop.textContent = c.name;
            chatTitle.textContent = c.name;
        }
        setIslandLabel(c.name);
        renderChats();
    }

    function adjustWallet(delta) {
        walletBalance = Math.max(0, walletBalance + delta);
        updateWalletDisplay();
    }

    function setChatActions(open) {
        if (!chatActionsPanel || !chatActionsToggle) return;
        const shouldOpen = typeof open === "boolean" ? open : !chatActionsOpen;
        chatActionsOpen = shouldOpen;
        chatActionsPanel.classList.toggle("open", chatActionsOpen);
        chatActionsToggle.classList.toggle("active", chatActionsOpen);
        if (!chatActionsOpen) closeChatActionForm();
    }

    function openChatActionForm(type) {
        if (!chatActionForm || !chatActionLabel || !chatActionAmount) return;
        const preset = ACTION_PRESETS[type];
        if (!preset) return;
        currentChatAction = { ...preset };
        chatActionLabel.textContent = preset.label;
        chatActionAmount.value = preset.defaultValue.toFixed(2);
        chatActionAmount.min = preset.min;
        chatActionAmount.max = preset.max;
        chatActionForm.classList.add("show");
        chatActionAmount.focus();
        setChatActions(true);
    }

    function closeChatActionForm() {
        if (chatActionForm) chatActionForm.classList.remove("show");
        currentChatAction = null;
    }

    function showRedEnvelopeOverlay(message, chatId) {
        if (!redEnvelopeOverlay || !message) return;
        pendingRedEnvelope = { message, chatId };
        setChatActions(false);
        if (redEnvelopeAmount) {
            const amt = message.amount != null ? message.amount : 0;
            redEnvelopeAmount.textContent = `¥${amt.toFixed(2)}`;
        }
        redEnvelopeOverlay.classList.add("show");
    }

    function hideRedEnvelopeOverlay() {
        if (redEnvelopeOverlay) redEnvelopeOverlay.classList.remove("show");
        pendingRedEnvelope = null;
    }

    function sendChat(textOverride, kindOverride, meta = {}) {
        if (!chatWindow || !chatInput) return;
        const id = chatWindow.dataset.chat;
        const c = chats.find(x => x.id === id);
        if (!c) return;
        const text = (textOverride != null ? textOverride : chatInput.value.trim());
        if (!text) return;
        const kind = kindOverride || "";
        const msg = {
            from: "out",
            text,
            kind,
        };
        if (meta.amount != null) msg.amount = meta.amount;
        if (meta.redeemed) msg.redeemed = true;
        c.log.push(msg);
        c.preview = text;
        c.time = "刚刚";
        chatInput.value = "";
        setChatActions(false);
        openChat(id);
        renderChats();
        setTimeout(() => {
            c.log.push({ from:"in", text:"“我听见了。”" });
            c.preview = "“我听见了。”";
            c.time = "刚刚";
            const active = chatWindow && chatWindow.style.display !== "none" && chatWindow.dataset.chat === id;
            if (!active) c.unread = (c.unread || 0) + 1;
            if (active) {
                openChat(id);
            } else {
                renderChats();
            }
            triggerIslandNotify("微信新消息");
        }, 500);
    }

    if (chatSend) chatSend.addEventListener("click", sendChat);
    if (chatInput) chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendChat();
        }
    });
    if (chatActionsToggle) {
        chatActionsToggle.addEventListener("click", () => {
            setChatActions();
        });
    }
    chatActionButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            openChatActionForm(btn.dataset.chataction);
        });
    });
    if (chatActionConfirm && chatActionAmount) {
        chatActionConfirm.addEventListener("click", () => {
            if (!currentChatAction) return;
            const amount = parseFloat(chatActionAmount.value);
            if (Number.isNaN(amount)) {
                alert("请输入有效的金额");
                return;
            }
            if (amount < currentChatAction.min || amount > currentChatAction.max) {
                alert(`金额需在 ${currentChatAction.min} - ${currentChatAction.max} 之间`);
                return;
            }
            const formatted = amount.toFixed(2);
            if (currentChatAction.type === "pay") {
                sendChat(`转账 ¥${formatted}`, "pay", { amount });
                adjustWallet(-amount);
                addMemoEntry(`转账 → ¥${formatted}`);
            } else if (currentChatAction.type === "red") {
                sendChat(`红包 ¥${formatted}`, "red", { amount, redeemed: true });
                adjustWallet(-amount);
            }
            closeChatActionForm();
            setChatActions(false);
        });
    }
    if (chatActionCancel) {
        chatActionCancel.addEventListener("click", () => {
            closeChatActionForm();
        });
    }
    if (redEnvelopeConfirm) {
        redEnvelopeConfirm.addEventListener("click", () => {
            if (pendingRedEnvelope && pendingRedEnvelope.message) {
                const msg = pendingRedEnvelope.message;
                msg.redeemed = true;
                if (msg.amount != null) {
                    msg.text = `已收红包 ¥${msg.amount.toFixed(2)}`;
                    adjustWallet(msg.amount);
                }
                const activeId = chatWindow ? chatWindow.dataset.chat : null;
                if (activeId && pendingRedEnvelope.chatId === activeId) {
                    openChat(activeId);
                } else {
                    renderChats();
                }
            }
            hideRedEnvelopeOverlay();
        });
    }
    if (redEnvelopeOverlay) {
        redEnvelopeOverlay.addEventListener("click", (e) => {
            if (e.target === redEnvelopeOverlay) {
                hideRedEnvelopeOverlay();
            }
        });
    }
    if (chatBack) chatBack.addEventListener("click", () => {
        if (chatWindow) chatWindow.style.display = "none";
        switchTab("chats");
        setIslandLabel("Wechat");
        hideRedEnvelopeOverlay();
        const top = document.getElementById("wechat-top");
        if (top) top.textContent = `Wechat (${totalUnreadCount()})`;
    });

    /* 电话页：记录/联系人/拨号 */
    const callTabs = document.querySelectorAll('[data-ctab]');
    const callPanels = {
        history: document.getElementById("call-history"),
        contacts: document.getElementById("call-contacts"),
        keypad: document.getElementById("call-keypad"),
    };
    const dialDisplay = document.getElementById("dial-display");
    const dialGrid = document.getElementById("dial-grid");
    const dialCall = document.getElementById("dial-call");
    const callHistory = [
        { name: "未知来电", time: "刚刚", note: "00:42" },
        { name: "室友", time: "昨天", note: "01:10" },
        { name: "未知号码", time: "前天", note: "未接" },
    ];
    const contacts = [
        { name: "元书", tel: "未知线路" },
        { name: "室友", tel: "131****8888" },
        { name: "学妹", tel: "185****0000" },
    ];
    function renderCallHistory() {
        const wrap = callPanels.history;
        if (!wrap) return;
        wrap.innerHTML = "";
        callHistory.forEach(c => {
            const div = document.createElement("div");
            div.className = "call-item";
            div.innerHTML = `
                <div class="top"><span>${c.name}</span><span>${c.time}</span></div>
                <div class="sub">${c.note}</div>
            `;
            wrap.appendChild(div);
        });
    }
    function renderContactsList() {
        const wrap = callPanels.contacts;
        if (!wrap) return;
        wrap.innerHTML = "";
        contacts.forEach(c => {
            const div = document.createElement("div");
            div.className = "call-item";
            div.innerHTML = `<div class="top"><span>${c.name}</span><span>${c.tel}</span></div>`;
            wrap.appendChild(div);
        });
    }
    function renderDial() {
        if (!dialGrid) return;
        const keys = ["1","2","3","4","5","6","7","8","9","*","0","#"];
        dialGrid.innerHTML = "";
        keys.forEach(k => {
            const btn = document.createElement("button");
            btn.className = "dial-key";
            btn.textContent = k;
            btn.addEventListener("click", () => {
                const base = dialDisplay.textContent === "输入号码…" ? "" : dialDisplay.textContent;
                dialDisplay.textContent = base + k;
            });
            dialGrid.appendChild(btn);
        });
        if (dialCall) {
            dialCall.addEventListener("click", () => {
                const num = (dialDisplay.textContent || "").trim() || "未知号码";
                callHistory.unshift({ name: num, time: "刚刚", note: "去电" });
                renderCallHistory();
                dialDisplay.textContent = "输入号码…";
                addMemoEntry(`呼出 → 元书`);
                triggerIslandNotify("呼出：元书");
                startCallSession("元书", "outgoing");
            });
        }
    }
    function switchCallTab(target) {
        callTabs.forEach(btn => btn.classList.toggle("active", btn.dataset.ctab === target));
        Object.entries(callPanels).forEach(([key, el]) => {
            if (el) el.style.display = (key === target) ? "grid" : "none";
        });
    }
    callTabs.forEach(btn => btn.addEventListener("click", () => switchCallTab(btn.dataset.ctab)));
    renderCallHistory();
    renderContactsList();
    renderDial();
    switchCallTab("history");

    function triggerIncomingCall(name = "未知来电", retry = true) {
        callHistory.unshift({ name, time: "刚刚", note: "来电" });
        renderCallHistory();
        switchCallTab("history");
        triggerIslandNotify(`来电：${name}`);
        addMemoEntry(`来电 ← ${name}`);
        showIslandCallAlert(name, { retry });
    }

    renderChats();
    renderMoments();
    renderWallet();
    switchTab("chats");
    setIslandLabel("Wechat");

    updateWalletDisplay();

    // 黑雾点击：注入消息+转账，触发岛通知
    document.querySelectorAll('.app-icon[data-target="darkfog-page"]').forEach(icon => {
        icon.addEventListener('click', () => {
            const targetChat = chats.find(x => x.id === "yuan");
            if (targetChat) {
                targetChat.log.push({ from:"in", text:"黑雾覆盖：他在看你。" });
                targetChat.log.push({ from:"in", text:"红包 ¥18.00", kind:"red", amount: 18.00, redeemed: false });
                targetChat.log.push({ from:"in", text:"转账 ¥66.00", kind:"pay", amount: 66.00 });
                targetChat.preview = "转账 ¥66.00";
                targetChat.time = "刚刚";
                targetChat.unread = (targetChat.unread || 0) + 3;
                walletBalance += 66;
                updateWalletDisplay();
                renderChats();
                triggerIslandNotify("微信新消息");
            }
        });
    });

    // 守望：触发来电
    document.querySelectorAll('.app-icon[data-target="watch-page"]').forEach(icon => {
        icon.addEventListener('click', () => {
            triggerIncomingCall("守望 · 来电");
        });
    });
}

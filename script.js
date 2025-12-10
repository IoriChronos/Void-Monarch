
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const appIcons = document.querySelectorAll('.app-icon');
    const memoLogEl = document.getElementById('memo-log');
    const memoClearBtn = document.getElementById('memo-clear');
    memoState.listEl = memoLogEl;
    renderMemoLog();
    if (memoClearBtn) memoClearBtn.addEventListener('click', clearMemoEntries);
    document.querySelectorAll('[data-call-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            handleIslandCallAction(btn.dataset.callAction);
        });
    });

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

    window.__openPhonePage = openPage;

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
    const phoneToggleBubble = document.getElementById('phone-toggle-bubble');

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

    let phoneAlertTimer = null;

    function clearPhoneAlert() {
        if (!toggleBtn) return;
        toggleBtn.classList.remove('notify');
        if (phoneToggleBubble) phoneToggleBubble.classList.remove('show');
        if (phoneAlertTimer) {
            clearTimeout(phoneAlertTimer);
            phoneAlertTimer = null;
        }
    }

    function setPhoneVisible(show) {
        phoneVisible = show;
        if (isMobileMode()) {
            if (show) {
                phoneLayer.classList.add('show');
                body.classList.add('phone-open');
                triggerIslandUnlock();
                clearPhoneAlert();
            } else {
                phoneLayer.classList.remove('show');
                body.classList.remove('phone-open');
            }
        } else {
            body.classList.toggle('phone-open', show);
            if (show) {
                triggerIslandUnlock();
                clearPhoneAlert();
            }
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
// 逻辑已拆分至 apps/wechat.js

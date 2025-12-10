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
    callOverlayState.previousLabel = "";
    setIslandLabel(DEFAULT_ISLAND_LABEL);
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
    if (phoneAlertHandler) phoneAlertHandler("来电");
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

window.handleIslandCallAction = handleIslandCallAction;
window.startCallSession = startCallSession;
window.endCallSession = endCallSession;
window.showIslandCallAlert = showIslandCallAlert;
window.hideIslandCallAlert = hideIslandCallAlert;
window.triggerIncomingCall = window.triggerIncomingCall || function() {};

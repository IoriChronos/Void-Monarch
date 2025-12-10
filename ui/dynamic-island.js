const DEFAULT_ISLAND_LABEL = "···";
let dynamicIsland = null;
let dynamicIslandContent = null;
let dynamicIslandLabel = DEFAULT_ISLAND_LABEL;
let islandClickBound = false;
let phoneAlertHandler = null;

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
    phoneAlertHandler = (text = "新消息") => {
        if (!toggleBtn || phoneVisible) return;
        toggleBtn.classList.add('notify');
        if (phoneToggleBubble) {
            phoneToggleBubble.textContent = text;
            phoneToggleBubble.classList.add('show');
        }
        if (phoneAlertTimer) clearTimeout(phoneAlertTimer);
        phoneAlertTimer = setTimeout(() => {
            clearPhoneAlert();
        }, 2600);
    };
    dynamicIslandLabel = text || DEFAULT_ISLAND_LABEL;
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

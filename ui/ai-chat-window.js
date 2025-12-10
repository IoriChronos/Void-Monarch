export function initAIChatWindow(options = {}) {
    const storyLog = document.getElementById("story-log");
    const storyInput = document.getElementById("story-input");
    const storySend = document.getElementById("story-send");
    const collapseBtn = document.getElementById("input-collapse-btn");
    const toolsBtn = document.getElementById("story-tools-btn");
    const toolsMenu = document.getElementById("story-tools-menu");
    const systemBtn = document.getElementById("story-tool-system");
    const restartBtn = document.getElementById("story-tool-restart");
    const restartSheet = document.getElementById("restart-sheet");
    const restartButtons = restartSheet?.querySelectorAll("[data-restart]");

    if (!storyLog || !storyInput || !storySend) {
        throw new Error("AI chat window elements missing");
    }

    let systemMode = false;
    let continueBtn = null;

    function limitTwoLines() {
        storyInput.classList.remove("expanded");
        collapseBtn?.classList.add("hidden");
        storyInput.style.height = "auto";
        const lineHeight = parseFloat(getComputedStyle(storyInput).lineHeight);
        const twoLineHeight = lineHeight * 2 + 10;
        storyInput.style.height = `${twoLineHeight}px`;
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
            storyInput.style.height = `${scrollH}px`;
        } else {
            storyInput.style.height = `${max}px`;
        }
        collapseBtn?.classList.remove("hidden");
    }

    function appendBubble(role, text) {
        if (!storyLog) return;
        const bubble = document.createElement("div");
        bubble.className = `story-bubble ${role}`;
        bubble.textContent = text;
        storyLog.appendChild(bubble);
        storyLog.scrollTop = storyLog.scrollHeight;
        if (continueBtn) {
            continueBtn.remove();
            continueBtn = null;
        }
        if (role === "system") {
            continueBtn = document.createElement("button");
            continueBtn.className = "continue-btn";
            continueBtn.textContent = "继续说";
            continueBtn.addEventListener("click", () => {
                const handler = options.onContinue;
                continueBtn?.remove();
                continueBtn = null;
                handler?.();
            }, { once: true });
            bubble.insertAdjacentElement("afterend", continueBtn);
        }
        return bubble;
    }

    function handleSubmit() {
        const value = storyInput.value.trim();
        if (!value) return;
        storyInput.value = "";
        limitTwoLines();
        if (systemMode) {
            options.onSystemSubmit?.(value);
            toggleSystemMode(false);
        } else if (typeof options.onSubmit === "function") {
            options.onSubmit(value);
        }
    }

    function toggleSystemMode(forceValue) {
        systemMode = typeof forceValue === "boolean" ? forceValue : !systemMode;
        storyInput.classList.toggle("system-mode", systemMode);
        storyInput.placeholder = systemMode
            ? "System Prompt · persona/world/rules/dynamic"
            : "在这里输入给元书的话…";
        systemBtn?.classList.toggle("active", systemMode);
        options.onSystemModeChange?.(systemMode);
    }

    function toggleToolsMenu(forceValue) {
        const targetState = typeof forceValue === "boolean"
            ? forceValue
            : !toolsMenu?.classList.contains("show");
        toolsMenu?.classList.toggle("show", targetState);
        toolsBtn?.classList.toggle("active", targetState);
    }

    function openRestartSheet() {
        restartSheet?.classList.add("show");
        restartSheet?.setAttribute("aria-hidden", "false");
    }

    function closeRestartSheet() {
        restartSheet?.classList.remove("show");
        restartSheet?.setAttribute("aria-hidden", "true");
    }

    storyInput.addEventListener("input", autoGrowInput);
    if (collapseBtn) {
        collapseBtn.addEventListener("click", () => {
            limitTwoLines();
        });
    }
    storySend.addEventListener("click", handleSubmit);
    storyInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    });

    toolsBtn?.addEventListener("click", () => {
        toggleToolsMenu();
    });

    systemBtn?.addEventListener("click", () => {
        toggleSystemMode();
        toggleToolsMenu(false);
    });

    restartBtn?.addEventListener("click", () => {
        toggleToolsMenu(false);
        openRestartSheet();
    });

    restartButtons?.forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.restart;
            closeRestartSheet();
            if (mode && mode !== "cancel") {
                options.onRestart?.(mode);
            }
        });
    });

    document.addEventListener("click", (event) => {
        if (!toolsBtn || !toolsMenu) return;
        if (!toolsBtn.contains(event.target) && !toolsMenu.contains(event.target)) {
            toggleToolsMenu(false);
        }
    });

    restartSheet?.addEventListener("click", (event) => {
        if (event.target === restartSheet) {
            closeRestartSheet();
        }
    });

    limitTwoLines();

    return {
        appendBubble,
        focusInput: () => storyInput.focus(),
        resetInput: limitTwoLines,
        replaceHistory(entries = []) {
            storyLog.innerHTML = "";
            continueBtn = null;
            entries.forEach(entry => appendBubble(entry.role, entry.text));
        },
        exitSystemMode: () => toggleSystemMode(false)
    };
}

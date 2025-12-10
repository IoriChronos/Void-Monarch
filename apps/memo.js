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

window.memoState = memoState;
window.renderMemoLog = renderMemoLog;
window.addMemoEntry = addMemoEntry;
window.clearMemoEntries = clearMemoEntries;

export function initMMOApp() {
    const page = document.getElementById("mmo-page");
    if (!page) return;
    page.dataset.ready = "true";
}

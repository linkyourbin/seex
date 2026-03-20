import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppState {
  history: [string, string][];
  matched: [string, string][];
  keyword: string;
  nlbn_output_path: string;
  nlbn_last_result: string | null;
  nlbn_show_terminal: boolean;
  nlbn_running: boolean;
  monitoring: boolean;
  history_count: number;
  matched_count: number;
}

type Lang = "en" | "zh";

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const translations: Record<Lang, Record<string, string>> = {
  en: {
    "nav.monitor": "Monitor",
    "nav.history": "History",
    "nav.export": "Export",
    "nav.language": "Language",
    "nav.about": "About",
    "status.listening": "Listening",
    "monitor.matchMode": "Match Mode",
    "monitor.quickId": "Quick ID",
    "monitor.fullInfo": "Full Info",
    "monitor.set": "Set",
    "monitor.monitoring": "Monitoring",
    "monitor.paused": "Paused",
    "monitor.quick": "Quick:",
    "monitor.matched": "Matched",
    "monitor.copyIds": "Copy IDs",
    "monitor.show": "Show",
    "monitor.hide": "Hide",
    "monitor.noMatches": "No matches yet",
    "monitor.clipboard": "Clipboard",
    "monitor.waiting": "Waiting for clipboard...",
    "monitor.saveHistory": "Save History",
    "monitor.exportMatched": "Export Matched",
    "monitor.clearAll": "Clear All",
    "monitor.sure": "Sure?",
    "monitor.yes": "Yes",
    "monitor.no": "No",
    "monitor.latest": "Latest:",
    "monitor.copy": "Copy",
    "monitor.delete": "Delete",
    "history.desc": "Clipboard history",
    "history.entries": "entries",
    "history.empty": "No history yet",
    "export.desc": "nlbn tool integration",
    "export.nlbnExport": "nlbn Export",
    "export.itemsReady": "items ready",
    "export.exportNlbn": "Export nlbn",
    "export.running": "Running...",
    "export.nlbnRunning": "nlbn is running, please wait...",
    "export.config": "Configuration",
    "export.exportDir": "Export directory:",
    "export.browse": "Browse",
    "export.apply": "Apply",
    "export.toggleTerminal": "Toggle Terminal",
    "export.terminalOn": "Terminal: ON",
    "export.terminalOff": "Terminal: OFF",
    "export.example": "Example: ~/lib or C:\\Users\\xxx\\lib",
    "language.desc": "Switch interface language",
    "language.select": "Select Language",
    "about.tagline": "Clipboard Event Tracker",
    "about.desc": "Monitors clipboard in real time, extracts component IDs using keyword or regex, and exports via nlbn.",
    "status.keyword": "Keyword:",
    "status.none": "none",
  },
  zh: {
    "nav.monitor": "\u76D1\u542C",
    "nav.history": "\u5386\u53F2",
    "nav.export": "\u5BFC\u51FA",
    "nav.language": "\u8BED\u8A00",
    "nav.about": "\u5173\u4E8E",
    "status.listening": "\u76D1\u542C\u4E2D",
    "monitor.matchMode": "\u5339\u914D\u6A21\u5F0F",
    "monitor.quickId": "\u76F4\u63A5 ID",
    "monitor.fullInfo": "\u4FE1\u606F\u63D0\u53D6",
    "monitor.set": "\u8BBE\u7F6E",
    "monitor.monitoring": "\u76D1\u542C\u4E2D",
    "monitor.paused": "\u5DF2\u6682\u505C",
    "monitor.quick": "\u5FEB\u6377:",
    "monitor.matched": "\u5339\u914D\u7ED3\u679C",
    "monitor.copyIds": "\u590D\u5236 ID",
    "monitor.show": "\u663E\u793A",
    "monitor.hide": "\u9690\u85CF",
    "monitor.noMatches": "\u6682\u65E0\u5339\u914D\u7ED3\u679C",
    "monitor.clipboard": "\u526A\u8D34\u677F",
    "monitor.waiting": "\u7B49\u5F85\u526A\u8D34\u677F\u5185\u5BB9...",
    "monitor.saveHistory": "\u4FDD\u5B58\u5386\u53F2",
    "monitor.exportMatched": "\u5BFC\u51FA\u5339\u914D",
    "monitor.clearAll": "\u6E05\u7A7A\u5168\u90E8",
    "monitor.sure": "\u786E\u8BA4\u6E05\u7A7A\uFF1F",
    "monitor.yes": "\u786E\u8BA4",
    "monitor.no": "\u53D6\u6D88",
    "monitor.latest": "\u6700\u65B0:",
    "monitor.copy": "\u590D\u5236",
    "monitor.delete": "\u5220\u9664",
    "history.desc": "\u526A\u8D34\u677F\u5386\u53F2",
    "history.entries": "\u6761",
    "history.empty": "\u6682\u65E0\u5386\u53F2\u8BB0\u5F55",
    "export.desc": "nlbn \u5DE5\u5177\u96C6\u6210",
    "export.nlbnExport": "nlbn \u5BFC\u51FA",
    "export.itemsReady": "\u4E2A\u5143\u4EF6\u5F85\u5BFC\u51FA",
    "export.exportNlbn": "\u5BFC\u51FA nlbn",
    "export.running": "\u8FD0\u884C\u4E2D...",
    "export.nlbnRunning": "nlbn \u6B63\u5728\u8FD0\u884C\uFF0C\u8BF7\u7A0D\u5019...",
    "export.config": "\u914D\u7F6E",
    "export.exportDir": "\u5BFC\u51FA\u76EE\u5F55:",
    "export.browse": "\u6D4F\u89C8",
    "export.apply": "\u5E94\u7528",
    "export.toggleTerminal": "\u5207\u6362\u7EC8\u7AEF",
    "export.terminalOn": "\u7EC8\u7AEF: \u5F00\u542F",
    "export.terminalOff": "\u7EC8\u7AEF: \u5173\u95ED",
    "export.example": "\u793A\u4F8B: ~/lib \u6216 C:\\Users\\xxx\\lib",
    "language.desc": "\u5207\u6362\u754C\u9762\u8BED\u8A00",
    "language.select": "\u9009\u62E9\u8BED\u8A00",
    "about.tagline": "\u526A\u8D34\u677F\u4E8B\u4EF6\u8FFD\u8E2A\u5668",
    "about.desc": "\u5B9E\u65F6\u76D1\u542C\u526A\u8D34\u677F\uFF0C\u901A\u8FC7\u5173\u952E\u8BCD\u6216\u6B63\u5219\u8868\u8FBE\u5F0F\u63D0\u53D6\u5143\u4EF6\u7F16\u53F7\uFF0C\u5E76\u901A\u8FC7 nlbn \u5BFC\u51FA\u3002",
    "status.keyword": "\u5173\u952E\u8BCD:",
    "status.none": "\u672A\u8BBE\u7F6E",
  },
};

let currentLang: Lang = "en";

function t(key: string): string {
  return translations[currentLang][key] ?? translations["en"][key] ?? key;
}

function applyLanguage(lang: Lang) {
  currentLang = lang;
  localStorage.setItem("seex-lang", lang);

  // Toggle Chinese font class
  document.documentElement.classList.toggle("lang-zh", lang === "zh");
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";

  // Update all data-i18n elements
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n")!;
    el.textContent = t(key);
  });

  // Update placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder")!;
    (el as HTMLInputElement).placeholder = t(key);
  });

  // Update language buttons
  $("btn-lang-en").classList.toggle("active", lang === "en");
  $("btn-lang-zh").classList.toggle("active", lang === "zh");

  // Update toggle button text
  $("btn-toggle-matched").textContent = showMatched ? t("monitor.show") : t("monitor.hide");
}

// ---------------------------------------------------------------------------
// UI state
// ---------------------------------------------------------------------------

let showMatched = true;
let showHistory = true;
let matchQuick = true;
let matchFull = true;

const PATTERN_QUICK = "regex:(?m)^(C\\d{3,})$";
const PATTERN_FULL = "regex:\u7F16\u53F7[\uFF1A:]\\s*(C\\d+)";

function buildKeyword(): string {
  const parts: string[] = [];
  if (matchFull) parts.push(PATTERN_FULL);
  if (matchQuick) parts.push(PATTERN_QUICK);
  return parts.join("||");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// Page navigation
// ---------------------------------------------------------------------------

function switchPage(pageName: string) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));

  const page = document.getElementById(`page-${pageName}`);
  const nav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
  if (page) page.classList.add("active");
  if (nav) nav.classList.add("active");
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderState(state: AppState) {
  const kwLabel = t("status.keyword");
  const noneLabel = t("status.none");

  // Status bar
  $("status-keyword").textContent = `${kwLabel} ${state.keyword || noneLabel}`;
  $("status-counts").textContent = `H: ${state.history_count} | M: ${state.matched_count}`;

  // Monitor page header
  $("monitor-status").textContent = `${kwLabel} ${state.keyword ? "LCSC" : noneLabel} | H: ${state.history_count} | M: ${state.matched_count}`;

  // nlbn path
  const pathInput = $("nlbn-path-input") as HTMLInputElement;
  if (document.activeElement !== pathInput) {
    pathInput.value = state.nlbn_output_path;
  }

  // Terminal status
  $("terminal-status").textContent = state.nlbn_show_terminal ? t("export.terminalOn") : t("export.terminalOff");

  // Monitor toggle button
  const monBtn = $("btn-toggle-monitor");
  monBtn.classList.toggle("active", state.monitoring);
  monBtn.textContent = state.monitoring ? t("monitor.monitoring") : t("monitor.paused");

  // Export
  $("export-count").textContent = `${state.matched_count} ${t("export.itemsReady")}`;
  const exportBtn = $("btn-nlbn-export") as HTMLButtonElement;
  if (state.matched_count === 0 || state.nlbn_running) {
    exportBtn.disabled = true;
    exportBtn.textContent = state.nlbn_running ? t("export.running") : t("export.exportNlbn");
  } else {
    exportBtn.disabled = false;
    exportBtn.textContent = t("export.exportNlbn");
  }

  // nlbn messages
  const nlbnStatus = $("nlbn-status");
  if (state.nlbn_running) {
    nlbnStatus.textContent = t("export.nlbnRunning");
    nlbnStatus.classList.remove("hidden");
  } else {
    nlbnStatus.classList.add("hidden");
  }

  const nlbnResult = $("nlbn-result");
  if (state.nlbn_last_result) {
    nlbnResult.textContent = state.nlbn_last_result;
    nlbnResult.classList.remove("hidden");
  } else {
    nlbnResult.classList.add("hidden");
  }

  // Matched
  $("matched-count").textContent = String(state.matched_count);
  if (showMatched && state.matched.length > 0) {
    $("matched-list").classList.remove("hidden");
    $("matched-empty").classList.add("hidden");
    renderMatchedList(state.matched);
  } else if (state.matched.length === 0) {
    $("matched-list").classList.add("hidden");
    $("matched-empty").classList.remove("hidden");
  } else {
    $("matched-list").classList.add("hidden");
    $("matched-empty").classList.add("hidden");
  }

  // Clipboard preview
  if (state.history.length > 0) {
    $("latest-preview").classList.remove("hidden");
    $("history-waiting").classList.add("hidden");
    const [time, content] = state.history[0];
    $("latest-time").textContent = `${t("monitor.latest")} ${time}`;
    ($("latest-content") as HTMLTextAreaElement).value = content;
  } else {
    $("latest-preview").classList.add("hidden");
    $("history-waiting").classList.remove("hidden");
  }

  // History page
  $("history-count-badge").textContent = String(state.history_count);
  if (showHistory && state.history.length > 0) {
    $("history-list").classList.remove("hidden");
    $("history-empty").classList.add("hidden");
    renderHistoryList(state.history);
  } else if (state.history.length === 0) {
    $("history-list").classList.add("hidden");
    $("history-empty").classList.remove("hidden");
  } else {
    $("history-list").classList.add("hidden");
    $("history-empty").classList.add("hidden");
  }
}

function renderMatchedList(items: [string, string][]) {
  const copyLabel = t("monitor.copy");
  const c = $("matched-list");
  c.innerHTML = "";
  items.forEach(([time, value], idx) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <span class="item-time">${escapeHtml(time)}</span>
      <span class="item-value">${escapeHtml(value)}</span>
      <span class="item-actions">
        <button data-copy="${escapeAttr(value)}" title="${copyLabel}">${copyLabel}</button>
        <button data-delete-matched="${idx}" title="${t("monitor.delete")}">&times;</button>
      </span>`;
    c.appendChild(row);
  });
}

function renderHistoryList(items: [string, string][]) {
  const copyLabel = t("monitor.copy");
  const c = $("history-list");
  c.innerHTML = "";
  items.forEach(([time, content], idx) => {
    const preview = content.split("\n")[0].substring(0, 80);
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div class="item-row">
        <span class="item-time">${escapeHtml(time)}</span>
        <span class="item-value">${escapeHtml(preview)}</span>
        <span class="item-actions">
          <button data-copy="${escapeAttr(content)}" title="${copyLabel}">${copyLabel}</button>
          <button data-delete-history="${idx}" title="${t("monitor.delete")}">&times;</button>
        </span>
      </div>`;
    c.appendChild(div);
  });
}

// ---------------------------------------------------------------------------
// State refresh
// ---------------------------------------------------------------------------

async function refreshState() {
  const state: AppState = await invoke("get_state");
  renderState(state);
}

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

window.addEventListener("DOMContentLoaded", async () => {
  // Load saved language
  const savedLang = localStorage.getItem("seex-lang") as Lang | null;
  if (savedLang === "zh" || savedLang === "en") {
    applyLanguage(savedLang);
  }

  await refreshState();

  await listen("clipboard-changed", () => { refreshState(); });

  // -- Sidebar navigation --
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.getAttribute("data-page");
      if (page) switchPage(page);
    });
  });

  // -- Sidebar collapse --
  $("btn-collapse").addEventListener("click", () => {
    $("sidebar").classList.toggle("collapsed");
  });

  // -- Language switching --
  $("btn-lang-en").addEventListener("click", () => {
    applyLanguage("en");
    refreshState();
  });
  $("btn-lang-zh").addEventListener("click", () => {
    applyLanguage("zh");
    refreshState();
  });

  // -- Match mode toggles (independent, both can be on) --
  $("btn-match-quick").addEventListener("click", async () => {
    matchQuick = !matchQuick;
    $("btn-match-quick").classList.toggle("active", matchQuick);
    await invoke("set_keyword", { keyword: buildKeyword() });
    await refreshState();
  });

  $("btn-match-full").addEventListener("click", async () => {
    matchFull = !matchFull;
    $("btn-match-full").classList.toggle("active", matchFull);
    await invoke("set_keyword", { keyword: buildKeyword() });
    await refreshState();
  });

  // -- Monitor toggle --
  $("btn-toggle-monitor").addEventListener("click", async () => {
    await invoke("toggle_monitoring");
    await refreshState();
  });

  // -- Matched toggle --
  $("btn-toggle-matched").addEventListener("click", () => {
    showMatched = !showMatched;
    $("btn-toggle-matched").classList.toggle("active", showMatched);
    $("btn-toggle-matched").textContent = showMatched ? t("monitor.show") : t("monitor.hide");
    refreshState();
  });

  // -- Copy IDs --
  $("btn-copy-ids").addEventListener("click", async () => {
    const ids: string[] = await invoke("get_unique_ids");
    if (ids.length > 0) {
      await invoke("copy_to_clipboard", { text: ids.join("\n") });
    }
  });

  // -- Export page --
  $("btn-nlbn-export").addEventListener("click", async () => {
    await invoke("nlbn_export");
    await refreshState();
  });

  $("btn-browse-folder").addEventListener("click", async () => {
    const selected = await open({ directory: true, title: "Select nlbn export directory" });
    if (selected) {
      ($("nlbn-path-input") as HTMLInputElement).value = selected as string;
      await invoke("set_nlbn_path", { path: selected as string });
      await refreshState();
    }
  });

  $("btn-apply-path").addEventListener("click", async () => {
    const path = ($("nlbn-path-input") as HTMLInputElement).value;
    await invoke("set_nlbn_path", { path });
    await refreshState();
  });

  $("btn-toggle-terminal").addEventListener("click", async () => {
    await invoke("toggle_terminal");
    await refreshState();
  });

  // -- Toolbar --
  $("btn-save-history").addEventListener("click", async () => { await invoke("save_history"); });
  $("btn-save-matched").addEventListener("click", async () => { await invoke("save_matched"); });

  $("btn-clear-all").addEventListener("click", () => {
    $("btn-clear-all").classList.add("hidden");
    $("clear-confirm").classList.remove("hidden");
  });
  $("btn-clear-confirm").addEventListener("click", async () => {
    $("btn-clear-all").classList.remove("hidden");
    $("clear-confirm").classList.add("hidden");
    await invoke("clear_all");
    await refreshState();
  });
  $("btn-clear-cancel").addEventListener("click", () => {
    $("btn-clear-all").classList.remove("hidden");
    $("clear-confirm").classList.add("hidden");
  });

  showHistory = true;

  // -- Delegated clicks --
  document.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;

    const urlEl = target.closest("[data-url]") as HTMLElement | null;
    if (urlEl) {
      const url = urlEl.getAttribute("data-url");
      if (url) { await openUrl(url); return; }
    }

    const copyVal = target.getAttribute("data-copy");
    if (copyVal !== null) {
      await invoke("copy_to_clipboard", { text: copyVal });
      return;
    }

    const dm = target.getAttribute("data-delete-matched");
    if (dm !== null) {
      await invoke("delete_matched", { index: parseInt(dm) });
      await refreshState();
      return;
    }

    const dh = target.getAttribute("data-delete-history");
    if (dh !== null) {
      await invoke("delete_history", { index: parseInt(dh) });
      await refreshState();
      return;
    }
  });
});

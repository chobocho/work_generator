/// <reference path="types.ts" />
/// <reference path="i18n.ts" />
/// <reference path="template.ts" />
/// <reference path="db.ts" />
/// <reference path="ui.ts" />

/** Application controller: wires state, DOM and persistence together. */
namespace App.Main {
  // Injected by the build step from CLAUDE_Template.data.
  declare const __DEFAULT_TEMPLATE__: string;

  const T = App.TemplateEngine;
  const U = App.UI;

  interface State {
    templateText: string;
    values: Record<string, string>;
    currentId: string | null;
    name: string;
  }

  const state: State = {
    templateText: "",
    values: {},
    currentId: null,
    name: "",
  };

  let rawOutput = "";
  let autosaveTimer = 0;
  let previewScale = 1;

  function defaultTemplate(): string {
    return typeof __DEFAULT_TEMPLATE__ === "string" ? __DEFAULT_TEMPLATE__ : "";
  }

  // --- persistence ---------------------------------------------------------
  function snapshot(): App.WorkRecord {
    return {
      id: state.currentId ?? "session",
      name: state.name || App.I18n.t("untitled"),
      templateText: state.templateText,
      values: state.values,
      updatedAt: Date.now(),
    };
  }

  function scheduleAutosave(): void {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }
    autosaveTimer = window.setTimeout(() => {
      void App.DB.saveSession(snapshot());
    }, 400);
  }

  // --- rendering -----------------------------------------------------------
  function applyStaticLabels(): void {
    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key) {
        node.textContent = App.I18n.t(key);
      }
    });
    document.querySelectorAll<HTMLElement>("[data-i18n-ph]").forEach((node) => {
      const key = node.getAttribute("data-i18n-ph");
      if (key) {
        (node as HTMLInputElement).placeholder = App.I18n.t(key);
      }
    });
    document.documentElement.lang = App.I18n.getLang();
  }

  function renderFields(): void {
    const host = U.$("#fields");
    host.innerHTML = "";
    const placeholders = T.parsePlaceholders(state.templateText);

    if (placeholders.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "—";
      host.appendChild(empty);
      return;
    }

    placeholders.forEach((p) => {
      const wrap = document.createElement("div");
      wrap.className = "field";

      const label = document.createElement("label");
      label.textContent = T.labelOf(p);
      const hint = document.createElement("span");
      hint.className = "field-token";
      hint.textContent = p.raw;
      label.appendChild(hint);

      const input = document.createElement("textarea");
      input.rows = 1;
      input.value = state.values[p.key] ?? "";
      input.setAttribute("aria-label", T.labelOf(p));
      autoGrow(input);
      input.addEventListener("input", () => {
        state.values[p.key] = input.value;
        autoGrow(input);
        updatePreview();
        updateStatus();
        scheduleAutosave();
      });

      wrap.appendChild(label);
      wrap.appendChild(input);
      host.appendChild(wrap);
    });
  }

  function autoGrow(el: HTMLTextAreaElement): void {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function updatePreview(): void {
    rawOutput = T.merge(state.templateText, state.values);
    U.$("#preview").innerHTML = U.renderMarkdown(rawOutput);
  }

  function updateStatus(): void {
    const remaining = T.remainingCount(state.templateText, state.values);
    const status = U.$("#status");
    if (remaining === 0) {
      status.textContent = "✅ " + App.I18n.t("complete");
      status.className = "status ok";
    } else {
      status.textContent = `📝 ${App.I18n.t("remaining")}: ${remaining}`;
      status.className = "status";
    }
  }

  async function renderLibrary(): Promise<void> {
    const list = U.$("#worksList");
    list.innerHTML = "";
    const works = await App.DB.listWorks();
    if (works.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.setAttribute("data-i18n", "noWorks");
      empty.textContent = App.I18n.t("noWorks");
      list.appendChild(empty);
      return;
    }
    works.forEach((w) => list.appendChild(workRow(w)));
  }

  function workRow(w: App.WorkRecord): HTMLElement {
    const row = document.createElement("div");
    row.className = "work-row" + (w.id === state.currentId ? " active" : "");

    const name = document.createElement("span");
    name.className = "work-name";
    name.textContent = w.name;
    row.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "work-actions";

    actions.appendChild(iconBtn(App.I18n.t("load"), "📂", () => void loadWork(w.id)));
    actions.appendChild(iconBtn(App.I18n.t("rename"), "✏️", () => void renameWork(w)));
    actions.appendChild(iconBtn(App.I18n.t("remove"), "🗑️", () => void deleteWork(w)));

    row.appendChild(actions);
    return row;
  }

  function iconBtn(title: string, glyph: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = "icon-btn";
    b.type = "button";
    b.title = title;
    b.textContent = glyph;
    b.addEventListener("click", onClick);
    return b;
  }

  // --- actions -------------------------------------------------------------
  async function loadWork(id: string): Promise<void> {
    const w = await App.DB.getWork(id);
    if (!w) {
      return;
    }
    state.currentId = w.id;
    state.name = w.name;
    state.templateText = w.templateText;
    state.values = { ...w.values };
    (U.$("#workName") as HTMLInputElement).value = w.name;
    (U.$("#templateText") as HTMLTextAreaElement).value = w.templateText;
    renderFields();
    updatePreview();
    updateStatus();
    await renderLibrary();
    scheduleAutosave();
    U.toast(App.I18n.t("loaded"));
  }

  async function renameWork(w: App.WorkRecord): Promise<void> {
    const next = window.prompt(App.I18n.t("promptRename"), w.name);
    if (next === null) {
      return;
    }
    const trimmed = next.trim() || App.I18n.t("untitled");
    await App.DB.saveWork({ ...w, name: trimmed, updatedAt: Date.now() });
    if (state.currentId === w.id) {
      state.name = trimmed;
      (U.$("#workName") as HTMLInputElement).value = trimmed;
    }
    await renderLibrary();
  }

  async function deleteWork(w: App.WorkRecord): Promise<void> {
    if (!window.confirm(App.I18n.t("confirmDelete"))) {
      return;
    }
    await App.DB.deleteWork(w.id);
    if (state.currentId === w.id) {
      state.currentId = null;
    }
    await renderLibrary();
    U.toast(App.I18n.t("deleted"));
  }

  async function save(asNew: boolean): Promise<void> {
    const nameInput = U.$("#workName") as HTMLInputElement;
    let name = nameInput.value.trim();
    if (!name) {
      const entered = window.prompt(App.I18n.t("promptName"), "");
      if (entered === null) {
        return;
      }
      name = entered.trim() || App.I18n.t("untitled");
      nameInput.value = name;
    }
    state.name = name;
    if (asNew || !state.currentId) {
      state.currentId = U.genId();
    }
    await App.DB.saveWork({
      id: state.currentId,
      name,
      templateText: state.templateText,
      values: state.values,
      updatedAt: Date.now(),
    });
    await renderLibrary();
    U.toast(App.I18n.t("saved"));
  }

  function newWork(): void {
    state.currentId = null;
    state.name = "";
    state.templateText = defaultTemplate();
    state.values = {};
    (U.$("#workName") as HTMLInputElement).value = "";
    (U.$("#templateText") as HTMLTextAreaElement).value = state.templateText;
    renderFields();
    updatePreview();
    updateStatus();
    void renderLibrary();
    scheduleAutosave();
  }

  async function exportAll(): Promise<void> {
    const works = await App.DB.listWorks();
    const payload = JSON.stringify({ version: 1, works }, null, 2);
    downloadText("work_generator_backup.json", payload, "application/json");
  }

  function importAll(file: File): void {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { works?: App.WorkRecord[] };
        const works = Array.isArray(parsed.works) ? parsed.works : [];
        const valid = works.filter(
          (w) => w && typeof w.id === "string" && typeof w.templateText === "string"
        );
        await App.DB.replaceAll(valid);
        await renderLibrary();
        U.toast(App.I18n.t("imported"));
      } catch {
        U.toast("JSON error");
      }
    };
    reader.readAsText(file);
  }

  function loadTemplateFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      state.templateText = String(reader.result);
      (U.$("#templateText") as HTMLTextAreaElement).value = state.templateText;
      renderFields();
      updatePreview();
      updateStatus();
      scheduleAutosave();
    };
    reader.readAsText(file);
  }

  function downloadText(filename: string, text: string, mime: string): void {
    const blob = new Blob([text], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyOutput(): void {
    const done = () => U.toast(App.I18n.t("copied"));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rawOutput).then(done, () => fallbackCopy(done));
    } else {
      fallbackCopy(done);
    }
  }

  function fallbackCopy(done: () => void): void {
    const ta = document.createElement("textarea");
    ta.value = rawOutput;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } finally {
      document.body.removeChild(ta);
    }
  }

  // --- zoom / appearance ---------------------------------------------------
  function setPreviewScale(scale: number): void {
    previewScale = Math.min(3, Math.max(0.5, scale));
    const stage = U.$("#previewStage");
    stage.style.transform = `scale(${previewScale})`;
    stage.style.transformOrigin = "top left";
  }

  function enablePinchZoom(): void {
    const area = U.$("#previewWrap");
    const pointers = new Map<number, { x: number; y: number }>();
    let startDist = 0;
    let startScale = 1;

    area.addEventListener("pointerdown", (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        startScale = previewScale;
      }
    });
    area.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) {
        return;
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && startDist > 0) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        setPreviewScale(startScale * (dist / startDist));
        e.preventDefault();
      }
    });
    const clear = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        startDist = 0;
      }
    };
    area.addEventListener("pointerup", clear);
    area.addEventListener("pointercancel", clear);

    // Desktop: Ctrl + wheel to zoom.
    area.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          setPreviewScale(previewScale * (e.deltaY < 0 ? 1.1 : 0.9));
        }
      },
      { passive: false }
    );
  }

  function setLang(lang: App.Lang): void {
    App.I18n.setLang(lang);
    applyStaticLabels();
    updateStatus();
    void renderLibrary();
    document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });
  }

  function setTheme(dark: boolean): void {
    document.body.classList.toggle("dark", dark);
  }

  // --- wiring --------------------------------------------------------------
  function wireEvents(): void {
    U.$("#saveBtn").addEventListener("click", () => void save(false));
    U.$("#saveAsNewBtn").addEventListener("click", () => void save(true));
    U.$("#newBtn").addEventListener("click", () => newWork());
    U.$("#copyBtn").addEventListener("click", () => copyOutput());
    U.$("#downloadBtn").addEventListener("click", () =>
      downloadText("CLAUDE.md", rawOutput, "text/markdown")
    );
    U.$("#exportBtn").addEventListener("click", () => void exportAll());

    const importFile = U.$("#importFile") as HTMLInputElement;
    U.$("#importBtn").addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", () => {
      if (importFile.files && importFile.files[0]) {
        importAll(importFile.files[0]);
        importFile.value = "";
      }
    });

    const tplFile = U.$("#templateFile") as HTMLInputElement;
    U.$("#loadTemplateBtn").addEventListener("click", () => tplFile.click());
    tplFile.addEventListener("change", () => {
      if (tplFile.files && tplFile.files[0]) {
        loadTemplateFile(tplFile.files[0]);
        tplFile.value = "";
      }
    });

    U.$("#resetTemplateBtn").addEventListener("click", () => {
      state.templateText = defaultTemplate();
      (U.$("#templateText") as HTMLTextAreaElement).value = state.templateText;
      renderFields();
      updatePreview();
      updateStatus();
      scheduleAutosave();
    });

    const tplArea = U.$("#templateText") as HTMLTextAreaElement;
    tplArea.addEventListener("input", () => {
      state.templateText = tplArea.value;
      renderFields();
      updatePreview();
      updateStatus();
      scheduleAutosave();
    });

    U.$("#toggleTemplate").addEventListener("click", () => {
      U.$("#templatePanel").classList.toggle("open");
    });

    document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((b) => {
      b.addEventListener("click", () => setLang(b.getAttribute("data-lang") as App.Lang));
    });

    const fontRange = U.$("#fontRange") as HTMLInputElement;
    fontRange.addEventListener("input", () => {
      U.$("#preview").style.fontSize = fontRange.value + "px";
    });

    U.$("#themeToggle").addEventListener("click", () => {
      const dark = !document.body.classList.contains("dark");
      setTheme(dark);
    });

    enablePinchZoom();
  }

  // --- bootstrap -----------------------------------------------------------
  export async function init(): Promise<void> {
    await App.DB.open();
    applyStaticLabels();
    wireEvents();

    const session = await App.DB.loadSession();
    if (session && session.templateText) {
      state.templateText = session.templateText;
      state.values = { ...session.values };
      state.name = session.name === App.I18n.t("untitled") ? "" : session.name;
      U.toast(App.I18n.t("restored"));
    } else {
      state.templateText = defaultTemplate();
    }

    (U.$("#templateText") as HTMLTextAreaElement).value = state.templateText;
    (U.$("#workName") as HTMLInputElement).value = state.name;

    renderFields();
    updatePreview();
    updateStatus();
    await renderLibrary();

    if (App.DB.isMemoryMode()) {
      const notice = U.$("#dbNotice");
      notice.textContent = App.I18n.t("dbUnavailable");
      notice.classList.add("show");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void App.Main.init();
});

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

  // Seed values applied when the user has not typed anything (CLAUDE.md request).
  const DEFAULT_VALUES: Record<string, string> = {
    "언어1": "HTML5",
    "언어2": "TypeScript",
  };

  // Placeholder key that gates saving: an empty title disables the save button.
  const TITLE_KEY = "제목";

  interface State {
    templateText: string;
    values: Record<string, string>;
  }

  const state: State = {
    templateText: "",
    values: {},
  };

  let rawOutput = "";
  let autosaveTimer = 0;
  let previewScale = 1;

  function defaultTemplate(): string {
    return typeof __DEFAULT_TEMPLATE__ === "string" ? __DEFAULT_TEMPLATE__ : "";
  }

  function seededDefaults(): Record<string, string> {
    return { ...DEFAULT_VALUES };
  }

  /** Ensure default keys keep their default when missing or blank. */
  function withDefaults(values: Record<string, string>): Record<string, string> {
    const merged = { ...values };
    Object.keys(DEFAULT_VALUES).forEach((k) => {
      if (merged[k] === undefined || merged[k].trim() === "") {
        merged[k] = DEFAULT_VALUES[k];
      }
    });
    return merged;
  }

  // --- persistence ---------------------------------------------------------
  function snapshot(): App.WorkRecord {
    return {
      id: "session",
      name: "",
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
    document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((node) => {
      const key = node.getAttribute("data-i18n-title");
      if (key) {
        node.title = App.I18n.t(key);
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
      if (p.key === TITLE_KEY) {
        const req = document.createElement("span");
        req.className = "req";
        req.textContent = " *";
        label.appendChild(req);
      }
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
        updateSaveState();
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
    // Preview mirrors the saved document: lines with unfilled placeholders are
    // dropped, so what you see is exactly what gets copied/saved.
    rawOutput = T.generate(state.templateText, state.values);
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

  /** A non-empty project title is required before CLAUDE.md can be saved. */
  function titleSatisfied(): boolean {
    const hasTitle = T.parsePlaceholders(state.templateText).some((p) => p.key === TITLE_KEY);
    if (!hasTitle) {
      return true;
    }
    const v = state.values[TITLE_KEY];
    return v !== undefined && v.trim() !== "";
  }

  function updateSaveState(): void {
    const btn = U.$("#downloadBtn") as HTMLButtonElement;
    const ok = titleSatisfied();
    btn.disabled = !ok;
    btn.title = ok ? App.I18n.t("save") : App.I18n.t("needTitle");
  }

  // --- actions -------------------------------------------------------------
  // rawOutput holds the generated document (kept in sync by updatePreview),
  // which is identical to what the preview shows.
  function copyOutput(): void {
    const text = rawOutput;
    const done = () => U.toast(App.I18n.t("copied"));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text: string, done: () => void): void {
    const ta = document.createElement("textarea");
    ta.value = text;
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

  function downloadOutput(): void {
    if (!titleSatisfied()) {
      U.toast(App.I18n.t("needTitle"));
      return;
    }
    const blob = new Blob([rawOutput], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CLAUDE.md";
    a.click();
    URL.revokeObjectURL(url);
    U.toast(App.I18n.t("downloaded"));
  }

  function resetAll(): void {
    if (!window.confirm(App.I18n.t("confirmReset"))) {
      return;
    }
    state.templateText = defaultTemplate();
    state.values = seededDefaults();
    (U.$("#templateText") as HTMLTextAreaElement).value = state.templateText;
    renderFields();
    updatePreview();
    updateStatus();
    updateSaveState();
    setView("preview");
    scheduleAutosave();
  }

  // --- view switching (preview / template) ---------------------------------
  function setView(view: "preview" | "template"): void {
    const showTemplate = view === "template";
    U.$("#previewWrap").hidden = showTemplate;
    U.$("#templateText").hidden = !showTemplate;
    document.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });
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
      // Only intercept when two fingers are down; one finger scrolls normally.
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
    updateSaveState();
    document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });
  }

  function setTheme(dark: boolean): void {
    document.body.classList.toggle("dark", dark);
  }

  // --- wiring --------------------------------------------------------------
  function wireEvents(): void {
    U.$("#copyBtn").addEventListener("click", () => copyOutput());
    U.$("#downloadBtn").addEventListener("click", () => downloadOutput());
    U.$("#resetBtn").addEventListener("click", () => resetAll());

    const tplArea = U.$("#templateText") as HTMLTextAreaElement;
    tplArea.addEventListener("input", () => {
      state.templateText = tplArea.value;
      renderFields();
      updatePreview();
      updateStatus();
      updateSaveState();
      scheduleAutosave();
    });

    document.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => {
      b.addEventListener("click", () => setView(b.getAttribute("data-view") as "preview" | "template"));
    });

    document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((b) => {
      b.addEventListener("click", () => setLang(b.getAttribute("data-lang") as App.Lang));
    });

    const fontRange = U.$("#fontRange") as HTMLInputElement;
    fontRange.addEventListener("input", () => {
      U.$("#preview").style.fontSize = fontRange.value + "px";
    });

    U.$("#themeToggle").addEventListener("click", () => {
      setTheme(!document.body.classList.contains("dark"));
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
      state.values = withDefaults(session.values);
      U.toast(App.I18n.t("restored"));
    } else {
      state.templateText = defaultTemplate();
      state.values = seededDefaults();
    }

    (U.$("#templateText") as HTMLTextAreaElement).value = state.templateText;

    renderFields();
    updatePreview();
    updateStatus();
    updateSaveState();
    setView("preview");

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

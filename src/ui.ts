/// <reference path="types.ts" />

/** Small DOM helpers, a toast, and a safe lightweight Markdown renderer. */
namespace App.UI {
  export function $(sel: string): HTMLElement {
    const node = document.querySelector(sel);
    if (!node) {
      throw new Error("Missing element: " + sel);
    }
    return node as HTMLElement;
  }

  /** Generate a reasonably unique id without relying on Math.random alone. */
  let counter = 0;
  export function genId(): string {
    counter += 1;
    const base = typeof performance !== "undefined" ? Math.floor(performance.now() * 1000) : counter;
    return "w_" + base.toString(36) + "_" + counter.toString(36);
  }

  export function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  let toastTimer = 0;
  export function toast(message: string): void {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("show");
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = window.setTimeout(() => node.classList.remove("show"), 1800);
  }

  /** Inline formatting: bold, inline code. Input must already be HTML-escaped. */
  function inline(escaped: string): string {
    return escaped
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  /**
   * Render a useful subset of Markdown to HTML for live preview.
   * Everything is escaped first, so the output is XSS-safe.
   */
  export function renderMarkdown(md: string): string {
    const lines = md.split(/\r?\n/);
    const out: string[] = [];
    let inList = false;
    let inCode = false;

    const closeList = () => {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine;

      // Fenced code blocks.
      if (/^```/.test(line.trim())) {
        if (inCode) {
          out.push("</code></pre>");
          inCode = false;
        } else {
          closeList();
          out.push("<pre><code>");
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        out.push(escapeHtml(line));
        continue;
      }

      const escaped = escapeHtml(line);

      const heading = escaped.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        closeList();
        const level = heading[1].length;
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        if (!inList) {
          out.push("<ul>");
          inList = true;
        }
        out.push("<li>" + inline(escaped.replace(/^\s*[-*]\s+/, "")) + "</li>");
        continue;
      }

      if (line.trim() === "") {
        closeList();
        continue;
      }

      closeList();
      out.push("<p>" + inline(escaped) + "</p>");
    }

    closeList();
    if (inCode) {
      out.push("</code></pre>");
    }
    return out.join("\n");
  }
}

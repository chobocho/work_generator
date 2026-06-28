/// <reference path="types.ts" />

/**
 * Pure (DOM-free) template engine.
 *
 * Placeholder grammar: `{%NAME%}` or `{%NAME%INDEX}` where INDEX is digits.
 *   - `{%제목%}`   -> name "제목",  index ""  -> key "제목"
 *   - `{%목표%1}`  -> name "목표",  index "1" -> key "목표1"
 *
 * Keeping this module free of browser globals makes it unit-testable in Node.
 */
namespace App.TemplateEngine {
  // Global flag is required for replace/exec sweeps; lastIndex is reset before use.
  const PLACEHOLDER_RE = /\{%(.+?)%(\d*)\}/g;

  function makeKey(name: string, index: string): string {
    return name + (index || "");
  }

  /** Build a display label such as "목표 1" (or just "제목" when no index). */
  export function labelOf(p: App.Placeholder): string {
    return p.index ? `${p.name} ${p.index}` : p.name;
  }

  /** Return the ordered, de-duplicated list of placeholders in a template. */
  export function parsePlaceholders(template: string): App.Placeholder[] {
    const seen = new Set<string>();
    const result: App.Placeholder[] = [];
    PLACEHOLDER_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PLACEHOLDER_RE.exec(template)) !== null) {
      const name = m[1];
      const index = m[2] || "";
      const key = makeKey(name, index);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ key, name, index, raw: m[0] });
      }
    }
    return result;
  }

  /**
   * Merge user values into the template.
   * A placeholder with a non-empty value is replaced; otherwise the raw token
   * is preserved so the user can still see what remains to be filled.
   */
  export function merge(template: string, values: Record<string, string>): string {
    return template.replace(PLACEHOLDER_RE, (match, name: string, index: string) => {
      const key = makeKey(name, index || "");
      const v = values[key];
      return v !== undefined && v.trim() !== "" ? v : match;
    });
  }

  /** True when the line contains at least one placeholder with no value. */
  function lineHasUnfilled(line: string, values: Record<string, string>): boolean {
    PLACEHOLDER_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PLACEHOLDER_RE.exec(line)) !== null) {
      const v = values[makeKey(m[1], m[2] || "")];
      if (v === undefined || v.trim() === "") {
        return true;
      }
    }
    return false;
  }

  /**
   * Produce the final document for saving: every line that still contains an
   * unfilled placeholder is dropped entirely, then remaining placeholders are
   * filled with their values.
   */
  export function generate(template: string, values: Record<string, string>): string {
    const kept = template
      .split(/\r?\n/)
      .filter((line) => !lineHasUnfilled(line, values));
    return merge(kept.join("\n"), values);
  }

  /** True when every placeholder in the template has a non-empty value. */
  export function isComplete(template: string, values: Record<string, string>): boolean {
    return parsePlaceholders(template).every((p) => {
      const v = values[p.key];
      return v !== undefined && v.trim() !== "";
    });
  }

  /** Count how many distinct placeholders still need a value. */
  export function remainingCount(template: string, values: Record<string, string>): number {
    return parsePlaceholders(template).filter((p) => {
      const v = values[p.key];
      return v === undefined || v.trim() === "";
    }).length;
  }
}

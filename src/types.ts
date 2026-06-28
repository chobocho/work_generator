namespace App {
  /** A single placeholder discovered inside a template. */
  export interface Placeholder {
    /** Unique key used to look up a value (name + index). */
    key: string;
    /** Human readable base name (e.g. "목표"). */
    name: string;
    /** Optional numeric suffix (e.g. "1"); empty string when absent. */
    index: string;
    /** The exact raw token as it appears in the template (e.g. "{%목표%1}"). */
    raw: string;
  }

  /** A persisted piece of work stored inside IndexedDB. */
  export interface WorkRecord {
    id: string;
    name: string;
    templateText: string;
    values: Record<string, string>;
    updatedAt: number;
  }

  /** Supported user-interface languages. */
  export type Lang = "ko" | "en";
}

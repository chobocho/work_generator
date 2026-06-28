/// <reference path="types.ts" />

/** UI string table and tiny translation helper. */
namespace App.I18n {
  type Dict = Record<string, { ko: string; en: string }>;

  const STRINGS: Dict = {
    appTitle: { ko: "CLAUDE.md 생성기", en: "CLAUDE.md Generator" },
    appSubtitle: {
      ko: "템플릿에 값을 채워 CLAUDE.md를 만드세요",
      en: "Fill the template values to build your CLAUDE.md",
    },
    inputs: { ko: "입력 값", en: "Inputs" },
    preview: { ko: "미리보기", en: "Preview" },
    template: { ko: "템플릿", en: "Template" },
    reset: { ko: "초기화", en: "Reset" },
    copy: { ko: "복사", en: "Copy" },
    save: { ko: "CLAUDE.md 저장", en: "Save CLAUDE.md" },
    copied: { ko: "복사되었습니다", en: "Copied" },
    downloaded: { ko: "CLAUDE.md를 저장했습니다", en: "Saved CLAUDE.md" },
    needTitle: { ko: "프로젝트 제목을 입력하세요", en: "Enter a project title first" },
    confirmReset: {
      ko: "입력값과 템플릿을 기본값으로 되돌릴까요?",
      en: "Reset inputs and template to defaults?",
    },
    remaining: { ko: "남은 항목", en: "Remaining" },
    complete: { ko: "모든 항목 작성 완료", en: "All fields complete" },
    fontSize: { ko: "글자 크기", en: "Font size" },
    zoomHint: {
      ko: "두 손가락으로 확대/축소할 수 있습니다",
      en: "Pinch with two fingers to zoom",
    },
    dbUnavailable: {
      ko: "저장소를 사용할 수 없어 임시 메모리에 저장합니다",
      en: "Storage unavailable; using in-memory fallback",
    },
    restored: { ko: "이전 작업을 이어합니다", en: "Restored previous session" },
  };

  let current: App.Lang = "ko";

  export function setLang(lang: App.Lang): void {
    current = lang;
  }

  export function getLang(): App.Lang {
    return current;
  }

  /** Translate a key for the active language; falls back to the key itself. */
  export function t(key: string): string {
    const entry = STRINGS[key];
    return entry ? entry[current] : key;
  }
}

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
    editTemplate: { ko: "템플릿 편집", en: "Edit template" },
    loadTemplateFile: { ko: "템플릿 파일 불러오기", en: "Load template file" },
    resetTemplate: { ko: "기본 템플릿으로", en: "Reset template" },
    library: { ko: "저장된 작업물", en: "Saved works" },
    workName: { ko: "작업물 이름", en: "Work name" },
    save: { ko: "저장", en: "Save" },
    saveAsNew: { ko: "새로 저장", en: "Save as new" },
    load: { ko: "불러오기", en: "Load" },
    rename: { ko: "이름 변경", en: "Rename" },
    remove: { ko: "삭제", en: "Delete" },
    newWork: { ko: "새 작업", en: "New" },
    exportAll: { ko: "전체 내보내기(JSON)", en: "Export all (JSON)" },
    importAll: { ko: "가져오기(JSON)", en: "Import (JSON)" },
    copy: { ko: "복사", en: "Copy" },
    download: { ko: "CLAUDE.md 다운로드", en: "Download CLAUDE.md" },
    copied: { ko: "복사되었습니다", en: "Copied" },
    saved: { ko: "저장되었습니다", en: "Saved" },
    deleted: { ko: "삭제되었습니다", en: "Deleted" },
    loaded: { ko: "불러왔습니다", en: "Loaded" },
    imported: { ko: "가져왔습니다", en: "Imported" },
    confirmDelete: { ko: "정말 삭제할까요?", en: "Delete this work?" },
    promptName: { ko: "작업물 이름을 입력하세요", en: "Enter a work name" },
    promptRename: { ko: "새 이름을 입력하세요", en: "Enter a new name" },
    noWorks: { ko: "저장된 작업물이 없습니다", en: "No saved works yet" },
    remaining: { ko: "남은 항목", en: "Remaining" },
    complete: { ko: "모든 항목 작성 완료", en: "All fields complete" },
    fontSize: { ko: "글자 크기", en: "Font size" },
    theme: { ko: "테마", en: "Theme" },
    zoomHint: {
      ko: "두 손가락으로 확대/축소할 수 있습니다",
      en: "Pinch with two fingers to zoom",
    },
    dbUnavailable: {
      ko: "저장소를 사용할 수 없어 임시 메모리에 저장합니다",
      en: "Storage unavailable; using in-memory fallback",
    },
    restored: { ko: "이전 작업을 이어합니다", en: "Restored previous session" },
    untitled: { ko: "제목 없음", en: "Untitled" },
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

# CLAUDE.md 생성기 (work_generator)

HTML5 기반의 **CLAUDE.md 생성기**입니다. 템플릿(`CLAUDE_Template.data`)의 플레이스홀더를 사용자가 입력한 값과 머지하여 `CLAUDE.md`를 만들어 줍니다. 외부 의존성 없이 동작하는 **단일 산출물 웹앱**(`index.html`)입니다.

## ✨ 주요 기능

- **템플릿 머지**: `{%이름%}` 또는 `{%이름%번호}` 형식의 플레이스홀더를 입력값으로 치환
- **실시간 미리보기**: 입력과 동시에 마크다운 렌더링 미리보기 제공
- **복사 / 다운로드**: 완성된 `CLAUDE.md`를 클립보드 복사 또는 파일 다운로드
- **저장소(IndexedDB)**: 여러 작업물 저장·불러오기·이름 변경·삭제
- **백업**: 전체 작업물을 하나의 JSON으로 내보내기 / 가져오기
- **작업 이어하기**: 진행 상황을 자동 저장하여 새로고침 후에도 복원
- **다국어**: 한글 / 영어 UI 전환
- **테마 / 글자 크기**: 라이트·다크 테마, 미리보기 글자 크기 조절
- **모바일·폴더블 대응**: 터치 UI, 두 손가락 확대/축소(pinch zoom), Ctrl+휠 줌
- **무의존성**: CDN·외부 폰트 없음, 브라우저 기본 폰트만 사용

## 📁 구조

```
src/            TypeScript 소스 (모듈화)
  types.ts      공통 타입 정의
  i18n.ts       다국어 문자열
  template.ts   템플릿 파싱·머지 엔진 (순수 로직, 테스트 대상)
  db.ts         IndexedDB 저장소 + 메모리 폴백
  ui.ts         DOM 헬퍼·토스트·마크다운 렌더러
  app.ts        애플리케이션 컨트롤러
  styles.css    스타일
test/           단위 테스트 (template 엔진)
index.template.html  HTML 셸 (빌드 시 CSS·JS·템플릿 인라인)
build.mjs       빌드 파이프라인 (컴파일 → 테스트 → 인라인 → release)
build.sh        POSIX 빌드 래퍼
build.bat       Windows 빌드 래퍼 (cp949)
index.html      빌드 산출물 (단일 파일)
release/        배포용 산출물
```

## 🚀 실행

```bash
# 빌드 (TypeScript 컴파일 + 테스트 + 단일 index.html 생성)
node build.mjs        # 또는: npm run build

# 로컬 서버 실행
python -m http.server 8001
# 브라우저에서 http://localhost:8001 접속
```

## 🧪 테스트

```bash
npm test
```

순수 로직인 템플릿 엔진(`src/template.ts`)을 Node 환경에서 검증합니다.

## 🔧 빌드 산출물

- 빌드하면 모든 CSS·JS·기본 템플릿이 인라인된 **단일 `index.html`** 이 생성됩니다.
- 실행에 필요한 파일은 `release/` 폴더로 복사됩니다.

## 📝 사용법

1. 좌측 **입력 값** 패널에서 각 항목을 채웁니다. (템플릿 편집 버튼으로 템플릿 자체도 수정 가능)
2. 중앙 **미리보기**에서 결과를 확인합니다.
3. **복사** 또는 **CLAUDE.md 다운로드** 버튼으로 결과물을 가져옵니다.
4. 우측 **저장된 작업물** 패널에서 작업물을 저장·관리하거나 JSON으로 백업합니다.

## 📄 라이선스

MIT

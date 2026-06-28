@echo off
chcp 949 >/dev/null
REM Windows 빌드 스크립트 - 단일 index.html 생성 후 release 폴더로 복사
cd /d "%~dp0"
node build.mjs
if errorlevel 1 (
  echo 빌드 실패
  exit /b 1
)
echo 빌드 완료. 산출물은 release 폴더에 있습니다.

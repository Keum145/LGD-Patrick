@echo off
chcp 65001 > nul
cd /d "%~dp0"

set "CODEX_NODE=C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%CODEX_NODE%" (
  echo 실행에 필요한 Node.js를 찾지 못했습니다.
  echo Node.js를 설치한 뒤 npm run dev 명령을 사용해 주세요.
  pause
  exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
  echo 필요한 패키지가 설치되어 있지 않습니다.
  echo Codex에서 패키지 설치를 먼저 요청해 주세요.
  pause
  exit /b 1
)

echo.
echo 뚱이랑 취뽀를 실행합니다.
echo 브라우저가 열리지 않으면 http://localhost:3000 을 입력하세요.
echo 이 창을 닫으면 홈페이지도 종료됩니다.
echo.

start "" "http://localhost:3000"
"%CODEX_NODE%" node_modules\next\dist\bin\next dev -p 3000

pause

@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%.") do set "PLUGIN_DIR=%%~fI"
for %%I in ("%PLUGIN_DIR%\..") do set "PARENT_DIR=%%~fI"

set "WORKSPACE_ROOT="
if exist "%PARENT_DIR%\jsbrains\package.json" if exist "%PARENT_DIR%\obsidian-smart-env\package.json" if exist "%PARENT_DIR%\smart-context-obsidian\package.json" set "WORKSPACE_ROOT=%PARENT_DIR%"
if not defined WORKSPACE_ROOT if exist "%PARENT_DIR%\smart-connections\jsbrains\package.json" if exist "%PARENT_DIR%\smart-connections\obsidian-smart-env\package.json" if exist "%PARENT_DIR%\smart-connections\smart-context-obsidian\package.json" set "WORKSPACE_ROOT=%PARENT_DIR%\smart-connections"

if not defined WORKSPACE_ROOT (
  echo [ERROR] Could not find sibling repositories.
  echo [ERROR] Expected either:
  echo         %PARENT_DIR%\jsbrains
  echo         %PARENT_DIR%\obsidian-smart-env
  echo         %PARENT_DIR%\smart-context-obsidian
  echo [ERROR] Or under:
  echo         %PARENT_DIR%\smart-connections\...
  exit /b 1
)

set "JSBRAINS_DIR=%WORKSPACE_ROOT%\jsbrains"
set "SMART_ENV_DIR=%WORKSPACE_ROOT%\obsidian-smart-env"
set "SMART_CONTEXT_DIR=%WORKSPACE_ROOT%\smart-context-obsidian"
set "SMART_PLUGINS_DIR=%WORKSPACE_ROOT%\smart-plugins-obsidian"

echo [INFO] Workspace root: %WORKSPACE_ROOT%

if not exist "%SMART_PLUGINS_DIR%\package.json" (
  echo [INFO] Creating local smart-plugins-obsidian stub...
  if not exist "%SMART_PLUGINS_DIR%" mkdir "%SMART_PLUGINS_DIR%"
  > "%SMART_PLUGINS_DIR%\package.json" echo {"name":"smart-plugins-obsidian","version":"0.0.0-local-stub","type":"module","main":"index.js"}
  > "%SMART_PLUGINS_DIR%\index.js" echo export default {};
)

call :run_npm_install "%JSBRAINS_DIR%" "jsbrains" || exit /b 1
call :run_npm_install "%SMART_ENV_DIR%" "obsidian-smart-env" || exit /b 1
call :run_npm_install "%PLUGIN_DIR%" "m42-obsidian-smart-connections" || exit /b 1

if not exist "%PLUGIN_DIR%\.env" (
  echo [INFO] Creating .env with defaults
  > "%PLUGIN_DIR%\.env" echo DEFAULT_OPEN_ROUTER_API_KEY=
)

pushd "%PLUGIN_DIR%" >nul
if not defined DEFAULT_OPEN_ROUTER_API_KEY set "DEFAULT_OPEN_ROUTER_API_KEY="
echo [INFO] Running plugin build...
call npm run build
if errorlevel 1 (
  popd >nul
  echo [ERROR] Build failed.
  exit /b 1
)
popd >nul

echo [OK] Build complete.
echo [INFO] Build output: %PLUGIN_DIR%\dist\main.js
echo [INFO] Auto-copy runs only when DESTINATION_VAULTS is set in %PLUGIN_DIR%\.env
echo [INFO] Example: DESTINATION_VAULTS=..\..\my-vault
exit /b 0

:run_npm_install
set "TARGET_DIR=%~1"
set "TARGET_NAME=%~2"

if not exist "%TARGET_DIR%\package.json" (
  echo [ERROR] Missing %TARGET_NAME% at %TARGET_DIR%
  exit /b 1
)

echo [INFO] Installing dependencies in %TARGET_NAME%...
pushd "%TARGET_DIR%" >nul
call npm install
if errorlevel 1 (
  popd >nul
  echo [ERROR] npm install failed in %TARGET_NAME%
  exit /b 1
)
popd >nul
exit /b 0

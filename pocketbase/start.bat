@echo off
echo Starting KittyAnime PocketBase backend...
echo Admin panel: http://127.0.0.1:8090/_/
echo.
cd /d "%~dp0"
pocketbase.exe serve --http=127.0.0.1:8090

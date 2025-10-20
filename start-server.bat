@echo off
echo ==========================================
echo   INICIANDO SERVIDOR EN MODO PRODUCCION
echo ==========================================
echo.

echo Verificando que el build existe...
if not exist "client\build\index.html" (
    echo ⚠️  Build no encontrado. Construyendo cliente...
    echo.
    cd client
    call npm run build
    if errorlevel 1 (
        echo ❌ ERROR: Falló la construcción del cliente
        pause
        exit /b 1
    )
    cd ..
    echo ✅ Cliente construido exitosamente
) else (
    echo ✅ Build encontrado
)

echo.
echo Iniciando servidor...
echo La aplicación estará disponible en:
echo 🌐 Local: http://localhost:5000
echo 🌐 Red: http://[TU_IP]:5000
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

set NODE_ENV=production
cd server
node index.js


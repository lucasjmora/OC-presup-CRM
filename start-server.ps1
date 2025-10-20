# Script para iniciar el servidor en modo producción
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  INICIANDO SERVIDOR EN MODO PRODUCCION" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el build existe
if (-not (Test-Path "client\build\index.html")) {
    Write-Host "⚠️  Build no encontrado. Construyendo cliente..." -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location "client"
    $buildResult = npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Falló la construcción del cliente" -ForegroundColor Red
        Read-Host "Presiona Enter para continuar"
        exit 1
    }
    Set-Location ".."
    Write-Host "✅ Cliente construido exitosamente" -ForegroundColor Green
} else {
    Write-Host "✅ Build encontrado" -ForegroundColor Green
}

Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host "La aplicación estará disponible en:" -ForegroundColor White
Write-Host "🌐 Local: http://localhost:5000" -ForegroundColor Cyan
Write-Host "🌐 Red: http://[TU_IP]:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

# Configurar variables de entorno y ejecutar
$env:NODE_ENV = "production"
Set-Location "server"
node index.js


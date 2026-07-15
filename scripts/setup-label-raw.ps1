$ErrorActionPreference = 'Stop'

$rawName = 'LABEL-RAW'
$portName = 'USB001'

Write-Host 'Configurando impresora USB RAW (solo cable, sin Bluetooth)...'
Write-Host ''

$port = Get-PrinterPort -Name $portName -ErrorAction SilentlyContinue
if (-not $port) {
  Write-Host "ERROR: No existe el puerto $portName. Conecta la impresora por USB."
  exit 1
}

# Preferir Generic / Text Only; si no existe, POS-58 (ya instalado en esta PC)
$driver = $null
foreach ($candidate in @('Generic / Text Only', 'Generic / Text Only', 'POS-58 11.3.0.0', 'POS-58')) {
  $found = Get-PrinterDriver -Name $candidate -ErrorAction SilentlyContinue
  if ($found) {
    $driver = $found.Name
    break
  }
}

if (-not $driver) {
  $pos = Get-PrinterDriver | Where-Object { $_.Name -like 'POS-58*' } | Select-Object -First 1
  if ($pos) { $driver = $pos.Name }
}

if (-not $driver) {
  Write-Host 'ERROR: No hay driver Generic/Text Only ni POS-58.'
  exit 1
}

Write-Host "Usando driver: $driver"
Write-Host "Puerto: $portName"

$existing = Get-Printer -Name $rawName -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.PortName -ne $portName -or $existing.DriverName -ne $driver) {
    Remove-Printer -Name $rawName
    Add-Printer -Name $rawName -DriverName $driver -PortName $portName
    Write-Host "Recreada: $rawName"
  } else {
    Write-Host "Ya existe: $rawName"
  }
} else {
  Add-Printer -Name $rawName -DriverName $driver -PortName $portName
  Write-Host "Creada: $rawName"
}

try { Set-Printer -Name $rawName -Datatype RAW -ErrorAction SilentlyContinue } catch {}

# Si el LABEL oficial está en 100x150, avisar
Write-Host ''
Write-Host 'IMPORTANTE en Windows (impresora LABEL):'
Write-Host '  Preferencias de impresion -> Tamano del papel: 40mm x 30mm (o el mas parecido)'
Write-Host '  Ahora mismo el driver puede estar en 100mm x 150mm (provoca hojas en blanco).'
Write-Host ''
Write-Host 'En .env.local:'
Write-Host '  PRINT_VIA=windows'
Write-Host "  PRINTER_NAME=$rawName"
Write-Host '  PRINT_MODE=tspl'
Write-Host ''
Write-Host 'Prueba: npm run print:test'

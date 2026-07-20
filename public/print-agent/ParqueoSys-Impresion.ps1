# ParqueoSys — agente de impresión local (sin Node, sin proyecto)
# Escucha en http://127.0.0.1:3847 y imprime en la impresora LABEL

$ErrorActionPreference = 'Stop'
$Port = 3847
$PrinterName = 'LABEL'

Add-Type -AssemblyName System.Drawing

function Get-VehicleLabel([string]$type) {
  switch ($type) {
    'car' { return 'AUTOMOVIL' }
    'motorcycle' { return 'MOTOCICLETA' }
    'truck' { return 'CAMIONETA' }
    default { return '' }
  }
}

function Format-BoDate([string]$iso) {
  try {
    $dt = [DateTimeOffset]::Parse($iso).ToOffset([TimeSpan]::FromHours(-4)).DateTime
  } catch {
    $dt = Get-Date
  }
  return $dt.ToString('dd/MM/yyyy')
}

function Format-BoTime([string]$iso) {
  try {
    $dt = [DateTimeOffset]::Parse($iso).ToOffset([TimeSpan]::FromHours(-4)).DateTime
  } catch {
    $dt = Get-Date
  }
  return $dt.ToString('HH:mm')
}

function Print-LabelGdi {
  param(
    [string]$Plate,
    [string]$Date,
    [string]$Time,
    [string]$Vehicle
  )

  $doc = New-Object System.Drawing.Printing.PrintDocument
  $doc.PrinterSettings.PrinterName = $PrinterName
  if (-not $doc.PrinterSettings.IsValid) {
    throw "Impresora no valida: $PrinterName. Instala el driver LABEL en este PC."
  }

  foreach ($ps in $doc.PrinterSettings.PaperSizes) {
    if ($ps.PaperName -like '*40mm x 30mm*' -or $ps.PaperName -eq '40mm x 30mm') {
      $doc.DefaultPageSettings.PaperSize = $ps
      break
    }
  }

  $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
  $doc.DocumentName = "ParqueoSys-$Plate"

  $script:Plate = $Plate
  $script:Date = $Date
  $script:Time = $Time
  $script:Vehicle = $Vehicle

  $doc.add_PrintPage({
    param($sender, $e)
    $g = $e.Graphics
    $w = [float]$e.PageBounds.Width
    $h = [float]$e.PageBounds.Height
    $black = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Black)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center

    $fBrand = New-Object System.Drawing.Font 'Arial', 7, ([System.Drawing.FontStyle]::Bold)
    $fPlate = New-Object System.Drawing.Font 'Arial', 11, ([System.Drawing.FontStyle]::Bold)
    $fVehicle = New-Object System.Drawing.Font 'Arial', 12, ([System.Drawing.FontStyle]::Bold)
    $fMeta = New-Object System.Drawing.Font 'Arial', 7, ([System.Drawing.FontStyle]::Regular)

    try {
      $gap = 2.0
      $lineH = @(
        $fBrand.GetHeight($g),
        $fPlate.GetHeight($g)
      )
      if ($script:Vehicle) { $lineH += $fVehicle.GetHeight($g) }
      $lineH += $fMeta.GetHeight($g)
      $lineH += $fMeta.GetHeight($g)

      $contentH = ($lineH | Measure-Object -Sum).Sum + ($gap * ([Math]::Max(0, $lineH.Count - 1)))
      $y = [Math]::Max(0, ($h - $contentH) / 2)

      $g.DrawString('PARQUEO', $fBrand, $black, ($w / 2), $y, $sf)
      $y += $lineH[0] + $gap
      $g.DrawString($script:Plate, $fPlate, $black, ($w / 2), $y, $sf)
      $y += $lineH[1] + $gap
      $idx = 2
      if ($script:Vehicle) {
        $g.DrawString($script:Vehicle, $fVehicle, $black, ($w / 2), $y, $sf)
        $y += $lineH[$idx] + $gap
        $idx++
      }
      $g.DrawString($script:Date, $fMeta, $black, ($w / 2), $y, $sf)
      $y += $lineH[$idx] + $gap
      $g.DrawString($script:Time, $fMeta, $black, ($w / 2), $y, $sf)
    } finally {
      $black.Dispose(); $sf.Dispose()
      $fBrand.Dispose(); $fPlate.Dispose(); $fVehicle.Dispose(); $fMeta.Dispose()
    }
    $e.HasMorePages = $false
  })

  $doc.Print()
}

function Set-CorsHeaders([System.Net.HttpListenerResponse]$res, [string]$origin) {
  $allow = '*'
  if ($origin) {
    if ($origin -like 'http://localhost*' -or $origin -like 'http://127.0.0.1*' -or $origin -like '*vercel.app*') {
      $allow = $origin
    }
  }
  $res.Headers['Access-Control-Allow-Origin'] = $allow
  $res.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $res.Headers['Access-Control-Allow-Headers'] = 'Content-Type, Access-Control-Request-Private-Network'
  $res.Headers['Access-Control-Allow-Private-Network'] = 'true'
  $res.Headers['Content-Type'] = 'application/json; charset=utf-8'
}

function Write-JsonResponse(
  [System.Net.HttpListenerResponse]$res,
  [int]$status,
  [hashtable]$payload,
  [string]$origin
) {
  Set-CorsHeaders $res $origin
  $res.StatusCode = $status
  if ($status -eq 204) {
    $res.Close()
    return
  }
  $json = ($payload | ConvertTo-Json -Compress)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.Close()
}

# Comprobar impresora
$test = New-Object System.Drawing.Printing.PrinterSettings
$test.PrinterName = $PrinterName
if (-not $test.IsValid) {
  Write-Host "ERROR: No se encontro la impresora '$PrinterName'." -ForegroundColor Red
  Write-Host "Instala el driver LABEL y conecta la Tomate por USB." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Impresoras detectadas:"
  Get-Printer | ForEach-Object { Write-Host "  - $($_.Name)" }
  Read-Host "Enter para salir"
  exit 1
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  # Ya hay un agente activo (botón de la web / inicio de Windows)
  try {
    $probe = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 2
    if ($probe.StatusCode -eq 200) {
      Write-Host "ParqueoSys ya estaba activo en el puerto $Port." -ForegroundColor Green
      Start-Sleep -Seconds 1
      exit 0
    }
  } catch { }
  Write-Host "ERROR: No se pudo abrir el puerto $Port." -ForegroundColor Red
  Write-Host $_.Exception.Message
  Write-Host "Cierra otra ventana de ParqueoSys-Impresion si esta abierta." -ForegroundColor Yellow
  Start-Sleep -Seconds 4
  exit 1
}

Write-Host "Listo. Impresora: $PrinterName" -ForegroundColor Green
Write-Host "Escuchando: $prefix" -ForegroundColor Green
Write-Host "Abre https://parqueo-two.vercel.app en ESTE PC." -ForegroundColor Cyan
Write-Host "No cierres esta ventana." -ForegroundColor Yellow
Write-Host ""

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $origin = $req.Headers['Origin']
    $path = $req.Url.AbsolutePath.TrimEnd('/')
    if (-not $path) { $path = '/' }

    if ($req.HttpMethod -eq 'OPTIONS') {
      Write-JsonResponse $res 204 @{} $origin
      continue
    }

    if ($req.HttpMethod -eq 'GET' -and ($path -eq '/health' -or $path -eq '/')) {
      Write-JsonResponse $res 200 @{
        ok = $true
        printer = $PrinterName
        mode = 'gdi'
        via = 'windows'
      } $origin
      continue
    }

    if ($req.HttpMethod -eq 'POST' -and $path -eq '/print') {
      $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
      $bodyText = $reader.ReadToEnd()
      $reader.Close()

      try {
        $body = $bodyText | ConvertFrom-Json
        $plate = ([string]$body.plate).Trim().ToUpperInvariant()
        $entryAt = [string]$body.entryAt
        if (-not $plate -or -not $entryAt) {
          Write-JsonResponse $res 400 @{ ok = $false; error = 'plate y entryAt son obligatorios' } $origin
          continue
        }

        $vehicle = Get-VehicleLabel ([string]$body.vehicleType)
        $date = Format-BoDate $entryAt
        $time = Format-BoTime $entryAt

        Print-LabelGdi -Plate $plate -Date $date -Time $time -Vehicle $vehicle
        Write-Host "$(Get-Date -Format 'HH:mm:ss') OK  $plate  $vehicle  $date $time" -ForegroundColor Green
        Write-JsonResponse $res 200 @{ ok = $true } $origin
      } catch {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') ERROR  $($_.Exception.Message)" -ForegroundColor Red
        Write-JsonResponse $res 500 @{ ok = $false; error = $_.Exception.Message } $origin
      }
      continue
    }

    Write-JsonResponse $res 404 @{ ok = $false; error = 'No encontrado' } $origin
  } catch {
    if ($listener.IsListening) {
      Write-Host "Aviso: $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
  }
}

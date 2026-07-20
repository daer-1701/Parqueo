param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$Plate,
  [Parameter(Mandatory = $true)][string]$Date,
  [Parameter(Mandatory = $true)][string]$Time,
  [Parameter(Mandatory = $false)][string]$Vehicle = ''
)

Add-Type -AssemblyName System.Drawing

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = $PrinterName
if (-not $doc.PrinterSettings.IsValid) {
  Write-Error "Impresora no válida: $PrinterName"
  exit 1
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
  $fVehicle = New-Object System.Drawing.Font 'Arial', 8, ([System.Drawing.FontStyle]::Bold)
  $fPlate = New-Object System.Drawing.Font 'Arial', 14, ([System.Drawing.FontStyle]::Bold)
  $fMeta = New-Object System.Drawing.Font 'Arial', 7, ([System.Drawing.FontStyle]::Regular)

  try {
    $gap = 2.0
    $lineH = @($fBrand.GetHeight($g))
    if ($script:Vehicle) { $lineH += $fVehicle.GetHeight($g) }
    $lineH += $fPlate.GetHeight($g)
    $lineH += $fMeta.GetHeight($g)
    $lineH += $fMeta.GetHeight($g)

    $contentH = ($lineH | Measure-Object -Sum).Sum + ($gap * ([Math]::Max(0, $lineH.Count - 1)))
    $y = [Math]::Max(0, ($h - $contentH) / 2)

    $g.DrawString('PARQUEO', $fBrand, $black, ($w / 2), $y, $sf)
    $y += $lineH[0] + $gap
    $idx = 1
    if ($script:Vehicle) {
      $g.DrawString($script:Vehicle, $fVehicle, $black, ($w / 2), $y, $sf)
      $y += $lineH[$idx] + $gap
      $idx++
    }
    $g.DrawString($script:Plate, $fPlate, $black, ($w / 2), $y, $sf)
    $y += $lineH[$idx] + $gap
    $idx++
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
Write-Output 'OK'

param(
  [Parameter(Mandatory = $true)][string]$Port,
  [Parameter(Mandatory = $true)][int]$Baud,
  [Parameter(Mandatory = $true)][string]$FilePath
)

Add-Type -AssemblyName System.IO.Ports
$serial = New-Object System.IO.Ports.SerialPort
$serial.PortName = $Port
$serial.BaudRate = $Baud
$serial.Parity = [System.IO.Ports.Parity]::None
$serial.DataBits = 8
$serial.StopBits = [System.IO.Ports.StopBits]::One
$serial.ReadTimeout = 2000
$serial.WriteTimeout = 5000

try {
  $serial.Open()
  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $serial.Write($bytes, 0, $bytes.Length)
  Start-Sleep -Milliseconds 800
  $serial.Close()
  Write-Output "OK $Port @ $Baud ($($bytes.Length) bytes)"
} catch {
  Write-Error $_.Exception.Message
  exit 1
}

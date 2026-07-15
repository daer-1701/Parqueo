$ErrorActionPreference = 'Stop'
$bytes = [System.IO.File]::ReadAllBytes('D:\Parqueo\parqueo-app\tmp-label.bin')
Write-Host "bytes=$($bytes.Length)"

try {
  $fs = [System.IO.File]::Open(
    '\\.\USB001',
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Write,
    [System.IO.FileShare]::ReadWrite
  )
  $fs.Write($bytes, 0, $bytes.Length)
  $fs.Flush()
  $fs.Close()
  Write-Host 'USB001 write OK'
} catch {
  Write-Host "USB001 FAIL: $($_.Exception.Message)"
}

Write-Host ''
Write-Host 'Puertos serie:'
Get-CimInstance Win32_SerialPort |
  Select-Object DeviceID, Description, Name |
  Format-Table -AutoSize |
  Out-String |
  Write-Host

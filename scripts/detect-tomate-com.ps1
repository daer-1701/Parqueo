Get-WmiObject Win32_SerialPort |
  Where-Object { $_.PNPDeviceID -match '5A4A010767FB|000205AC' } |
  Select-Object -First 1 -ExpandProperty DeviceID

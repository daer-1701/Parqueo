Get-WmiObject Win32_SerialPort |
  Select-Object DeviceID, Name, PNPDeviceID |
  ConvertTo-Json -Compress

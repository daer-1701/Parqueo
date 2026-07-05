Get-Printer |
  Select-Object Name, DriverName, PortName, PrinterStatus |
  ConvertTo-Json -Compress

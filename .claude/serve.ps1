# Простой локальный сервер для просмотра сайта: http://localhost:8080
param([int]$Port = 8080)
$root = Split-Path $PSScriptRoot -Parent
$types = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css'; '.js'='application/javascript'
  '.json'='application/json'; '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'
  '.jpeg'='image/jpeg'; '.gif'='image/gif'; '.webp'='image/webp'; '.ico'='image/x-icon'
  '.mp4'='video/mp4'; '.webm'='video/webm'; '.woff'='font/woff'; '.woff2'='font/woff2'
  '.xml'='application/xml'; '.txt'='text/plain; charset=utf-8'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
  if ($path -eq '') { $path = 'page43517438.html' }
  if ($path -eq 'politica' -or $path -eq 'politica/') { $path = 'page125438226.html' }
  $file = Join-Path $root $path
  $res = $ctx.Response
  try {
    if (-not (Test-Path $file -PathType Leaf)) { $file = Join-Path $root '404.html'; $res.StatusCode = 404 }
    $bytes = [IO.File]::ReadAllBytes($file)
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $res.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch { $res.StatusCode = 500 }
  $res.Close()
  Write-Host "$($res.StatusCode) /$path"
}

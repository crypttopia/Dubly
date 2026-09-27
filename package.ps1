param([string]$Output)

$root = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$files = @(
  'manifest.json', 'logo.png',
  'background.js', 'offscreen.html', 'offscreen.js', 'pcm-worklet.js',
  'popup.html', 'popup.css', 'popup.js', 'i18n.js',
  'mic-permission.html', 'mic-permission.css', 'mic-permission.js',
  'pages.html', 'pages.css', 'pages.js', 'donation.css', 'site-config.js',
  'subtitles.js', 'media-sync.js', 'voice-typing.js', 'activity.js',
  'assets/Vazirmatn.woff2', 'assets/OFL.txt', 'assets/wallet-qr.png', 'assets/voice-typing-logo.png', 'assets/translate.png', 'assets/setting.png'
)

Add-Type -AssemblyName System.IO.Compression
foreach ($file in $files) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $file) -PathType Leaf)) {
    throw "Missing extension file: $file"
  }
}
$manifest = Get-Content -LiteralPath (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
if (-not $Output) { $Output = "Dubly-$($manifest.version).zip" }
$target = Join-Path $root $Output
if ($Output -match '^Dubly-([0-9.]+)\.zip$' -and $Matches[1] -ne $manifest.version) {
  throw "Package filename does not match manifest version $($manifest.version)"
}
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
$stream = [System.IO.File]::Open($target, [System.IO.FileMode]::CreateNew)
try {
  $archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($file in $files) {
      $entry = $archive.CreateEntry($file.Replace('\', '/'), [System.IO.Compression.CompressionLevel]::Optimal)
      $source = [System.IO.File]::OpenRead((Join-Path $root $file))
      try {
        $destination = $entry.Open()
        try { $source.CopyTo($destination) } finally { $destination.Dispose() }
      } finally { $source.Dispose() }
    }
  } finally { $archive.Dispose() }
} finally { $stream.Dispose() }
Write-Output $target

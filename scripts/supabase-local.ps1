$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeDir = Join-Path $projectRoot ".tools\node-v22.23.2-win-x64"
$supabaseHome = Join-Path $projectRoot ".supabase-home"
$supabaseBin = Join-Path $projectRoot "node_modules\.bin\supabase.cmd"

if (-not (Test-Path (Join-Path $nodeDir "node.exe"))) {
  throw "Portable Node.js was not found at $nodeDir"
}

if (-not (Test-Path $supabaseBin)) {
  throw "Supabase CLI was not found at $supabaseBin"
}

New-Item -ItemType Directory -Force -Path $supabaseHome | Out-Null

$env:Path = "$nodeDir;$env:Path"
$env:USERPROFILE = $supabaseHome
$env:HOME = $supabaseHome
$env:SUPABASE_DISABLE_TELEMETRY = "1"

& $supabaseBin @args

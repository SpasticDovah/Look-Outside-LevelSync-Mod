param(
    [string]$GameDir = "C:\Program Files (x86)\Steam\steamapps\common\Look Outside",
    [switch]$Uninstall
)
$ErrorActionPreference = "Stop"

$pluginsDir = Join-Path $GameDir "js\plugins"
$pluginsJs = Join-Path $GameDir "js\plugins.js"
if (-not (Test-Path $pluginsJs)) { throw "plugins.js not found in '$GameDir'. Pass -GameDir." }

$text = [IO.File]::ReadAllText($pluginsJs)
$entryPattern = ',\s*\{\s*"name":\s*"LevelSync"[^}]*\{[^}]*\}\s*\}'

if ($Uninstall) {
    $text = [regex]::Replace($text, $entryPattern, "")
    [IO.File]::WriteAllText($pluginsJs, $text)
    Remove-Item (Join-Path $pluginsDir "LevelSync.js") -ErrorAction SilentlyContinue
    Write-Host "LevelSync removed (config file left in place)."
    return
}

$src = Join-Path $PSScriptRoot "js\plugins"
Copy-Item (Join-Path $src "LevelSync.js") $pluginsDir -Force
$cfg = Join-Path $pluginsDir "LevelSync.config.json"
if (-not (Test-Path $cfg)) { Copy-Item (Join-Path $src "LevelSync.config.json") $cfg }

if ($text -notmatch '"name":\s*"LevelSync"') {
    Copy-Item $pluginsJs "$pluginsJs.bak" -Force
    $entry = ',{"name":"LevelSync","status":true,"description":"Catch up inactive party members to Sam''s level on join.","parameters":{}}'
    $idx = $text.LastIndexOf("];")
    if ($idx -lt 0) { throw "Unexpected plugins.js format." }
    $head = $text.Substring(0, $idx).TrimEnd()
    $text = $head + $entry + "`r`n" + $text.Substring($idx)
    [IO.File]::WriteAllText($pluginsJs, $text)
    Write-Host "Registered LevelSync in plugins.js (backup: plugins.js.bak)."
}
Write-Host "LevelSync installed to $pluginsDir"

$inputFile = "..\data\AchievementsData.js"
$outputFile = "..\achievements.json"

$content = Get-Content $inputFile -Raw

# Remove header
$content = $content -replace "(?s)^.*?const ACHIEVEMENTS_DATA = ", ""

# Remove footer (everything after the object close, assuming it ends with }; before the footer)
# Actually, the file ends with }; then code. 
# Let's find the last }; and cut there.
# But nested braces make this hard. 
# Usage: We know the Footer starts with "if (typeof Object.freeze".
$content = $content -split "if \(typeof Object.freeze"
$content = $content[0]

# Remove comments
$content = $content -replace "//.*", ""

# Quote keys (simple word followed by colon)
# This is tricky for urls like "http:". But our keys are simple identifiers.
$content = $content -replace "(\s+)([a-zA-Z0-9_]+):", '$1"$2":'

# Fix single quotes to double quotes if any (our file uses double quotes mostly, but let's be safe)
# Actually, the file uses double quotes for values.

# Sanitize trailing commas (JSON doesn't like them)
# Replace ",(\s*)\}" with "$1}"
$content = $content -replace ",(\s*)\}", '$1}'
$content = $content -replace ",(\s*)\]", '$1]'

# Remove semi-colon at end if present
$content = $content -replace ";\s*$", ""
$content = $content.Trim()

Set-Content -Path $outputFile -Value $content
Write-Host "Conversion complete: $outputFile"

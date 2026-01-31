try {
    $content = Get-Content -Raw -Path "achievements.json"
    $json = $content | ConvertFrom-Json
    Write-Host "✅ JSON is valid."
} catch {
    Write-Error "❌ JSON is invalid: $_"
    exit 1
}

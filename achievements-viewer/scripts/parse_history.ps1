$inputFile = "streams_raw.txt"
$outputFile = "stream_history.json"

if (-not (Test-Path $inputFile)) {
    Write-Error "Input file not found: $inputFile"
    exit 1
}

$lines = Get-Content $inputFile
$entries = @()
$currentEntry = @{}

$months = @{
    "enero" = "01"; "febrero" = "02"; "marzo" = "03"; "abril" = "04"; "mayo" = "05"; "junio" = "06";
    "julio" = "07"; "agosto" = "08"; "septiembre" = "09"; "octubre" = "10"; "noviembre" = "11"; "diciembre" = "12"
}

# Regex patterns
$categoryRegex = "Horizontal • Emisión anterior • (.+)"
$dateRegex = "(\d{1,2}) de ([a-z]+) de (\d{4})"
$durationRegex = "^(\d+):(\d{2}):(\d{2})$|^(\d{2}):(\d{2})$|^(\d{1}):(\d{2})$"

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i].Trim()
    
    if ($line -match $categoryRegex) {
        $matches = $null
        $line -match $categoryRegex | Out-Null
        $category = $Matches[1].Trim()
        
        $currentEntry = @{
            category = $category
        }

        # Title (next non-empty)
        $j = $i + 1
        while ($j -lt $lines.Count -and -not $lines[$j].Trim()) { $j++ }
        if ($j -lt $lines.Count) {
            $currentEntry.title = $lines[$j].Trim()
            $i = $j
        }

        # Date (next non-empty)
        $j = $i + 1
        while ($j -lt $lines.Count -and -not $lines[$j].Trim()) { $j++ }
        if ($j -lt $lines.Count) {
            $dLine = $lines[$j].Trim()
            if ($dLine -match $dateRegex) {
                # $Matches contains the groups from the LAST match
                $day = $Matches[1].PadLeft(2, '0')
                $monthName = $Matches[2].ToLower()
                $year = $Matches[3]
                
                if ($months.ContainsKey($monthName)) {
                    $month = $months[$monthName]
                    $currentEntry.date = "$year-$month-$day"
                }
                $i = $j
            }
        }

        # Duration (next non-empty)
        $j = $i + 1
        while ($j -lt $lines.Count -and -not $lines[$j].Trim()) { $j++ }
        if ($j -lt $lines.Count) {
            $dLine = $lines[$j].Trim()
            if ($dLine -match $durationRegex) {
                $parts = $dLine -split ":"
                $duration = 0
                if ($parts.Count -eq 3) {
                    $duration = [int]$parts[0] * 60 + [int]$parts[1] + [Math]::Round([int]$parts[2] / 60)
                }
                else {
                    $duration = [int]$parts[0] + [Math]::Round([int]$parts[1] / 60)
                }
                $currentEntry.duration = $duration
                $i = $j
            }
        }

        if ($currentEntry.date -and $currentEntry.duration) {
            $entries += $currentEntry
        }
    }
}

# Aggregate by date
$byDate = @{}
foreach ($entry in $entries) {
    if (-not $byDate.ContainsKey($entry.date)) {
        $byDate[$entry.date] = @{
            date        = $entry.date
            duration    = 0
            count       = 0
            title       = $entry.title
            category    = $entry.category
            maxDuration = 0
        }
    }
    
    $obj = $byDate[$entry.date]
    $obj.duration += $entry.duration
    $obj.count++
    
    # Keep title/category of longest stream
    if ($entry.duration -gt $obj.maxDuration) {
        $obj.maxDuration = $entry.duration
        $obj.title = $entry.title
        $obj.category = $entry.category
    }
}

# Clean up internal props
$finalList = @{}
foreach ($key in $byDate.Keys) {
    $item = $byDate[$key]
    $item.Remove("maxDuration") # Remove helper
    $finalList[$key] = $item
}

$json = $finalList | ConvertTo-Json -Depth 5
Set-Content -Path $outputFile -Value $json
Write-Host "Generated history at $outputFile with $($finalList.Count) days."

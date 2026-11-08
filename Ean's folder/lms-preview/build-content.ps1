$ErrorActionPreference = 'Stop'

$sourceFolder = Split-Path -Parent $PSScriptRoot
$payload = [ordered]@{
    module = Get-Content -LiteralPath (Join-Path $sourceFolder 'module.json') -Raw | ConvertFrom-Json
    mockInterview = Get-Content -LiteralPath (Join-Path $sourceFolder 'mock_interview_activity.json') -Raw | ConvertFrom-Json
    reflection = Get-Content -LiteralPath (Join-Path $sourceFolder 'reflection_activity.json') -Raw | ConvertFrom-Json
    rubric = Get-Content -LiteralPath (Join-Path $sourceFolder 'feedback_rubric.json') -Raw | ConvertFrom-Json
}

$json = ConvertTo-Json -InputObject $payload -Depth 100 -Compress
$output = "window.LMS_DATA = $json;`n"
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'content.js') -Value $output -Encoding UTF8
Write-Host 'Preview content refreshed from the project JSON files.'

param(
  [string]$OutputRoot = "$env:USERPROFILE\Desktop\Heaven Beauty Original Images"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$headers = @{
  "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
}

$seedPages = @(
  "https://myheavenbeauty.com/",
  "https://myheavenbeauty.com/our-story/",
  "https://myheavenbeauty.com/shop/",
  "https://myheavenbeauty.com/product/heavenly-tint-kind/",
  "https://myheavenbeauty.com/product/heavenly-tint-pure/",
  "https://myheavenbeauty.com/product/heavenly-tint-love/",
  "https://myheavenbeauty.com/product/sparkly-tint-kind/",
  "https://myheavenbeauty.com/product/sparkly-tint-pure/",
  "https://myheavenbeauty.com/product/sparkly-tint-love/",
  "https://myheavenbeauty.com/product/devotion-sculpt-blush/"
)

function Ensure-Directory([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Sanitize-Name([string]$Value) {
  $name = $Value.ToLowerInvariant() -replace "https?://", "" -replace "[^a-z0-9._-]+", "-"
  $name = $name.Trim("-")
  if ($name.Length -gt 130) {
    $name = $name.Substring($name.Length - 130)
  }
  return $name
}

function Resolve-ImageUrl([string]$RawUrl, [string]$BaseUrl) {
  if ([string]::IsNullOrWhiteSpace($RawUrl)) {
    return $null
  }

  $clean = $RawUrl.Trim().Trim('"').Trim("'")
  if ($clean.StartsWith("data:") -or $clean.StartsWith("#")) {
    return $null
  }

  if ($clean.Contains(",")) {
    $clean = ($clean -split ",")[0].Trim()
  }

  if ($clean -match "\s") {
    $clean = ($clean -split "\s+")[0]
  }

  try {
    return ([Uri]::new([Uri]$BaseUrl, $clean)).AbsoluteUri
  } catch {
    return $null
  }
}

function Get-PageHtml([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -Headers $headers -UseBasicParsing -TimeoutSec 30
    return $response.Content
  } catch {
    Write-Warning "Could not fetch page: $Url ($($_.Exception.Message))"
    return ""
  }
}

function Get-ImageUrlsFromHtml([string]$Html, [string]$BaseUrl) {
  $urls = New-Object System.Collections.Generic.List[string]
  $patterns = @(
    '(?i)(?:src|href|data-src|data-large_image|data-bg|data-background-image)=["'']([^"'']+\.(?:jpg|jpeg|png|webp|avif|svg)(?:\?[^"'']*)?)["'']',
    '(?i)url\(["'']?([^)"'']+\.(?:jpg|jpeg|png|webp|avif|svg)(?:\?[^)"'']*)?)["'']?\)',
    '(?i)(https?://[^"''\s<>]+\.(?:jpg|jpeg|png|webp|avif|svg)(?:\?[^"''\s<>]*)?)'
  )

  foreach ($pattern in $patterns) {
    foreach ($match in [regex]::Matches($Html, $pattern)) {
      $url = Resolve-ImageUrl $match.Groups[1].Value $BaseUrl
      if ($url) {
        $urls.Add($url)
      }
    }
  }

  foreach ($match in [regex]::Matches($Html, '(?i)(?:srcset|data-srcset)=["'']([^"'']+)["'']')) {
    foreach ($candidate in $match.Groups[1].Value.Split(",")) {
      $url = Resolve-ImageUrl $candidate $BaseUrl
      if ($url) {
        $urls.Add($url)
      }
    }
  }

  return $urls | Sort-Object -Unique
}

function Get-GroupForUrl([string]$PageUrl, [string]$ImageUrl) {
  if ($PageUrl -like "*/our-story/*") { return "02-our-story" }
  if ($PageUrl -like "*/product/*") { return "04-products" }
  if ($PageUrl -like "*/shop/*") { return "04-products" }
  if ($ImageUrl -like "*heaven-beauty-logo*" -or $ImageUrl -like "*logo*") { return "00-brand" }
  return "01-home"
}

Ensure-Directory $OutputRoot

$downloaded = [ordered]@{}
$rows = New-Object System.Collections.Generic.List[object]
$allPages = New-Object System.Collections.Generic.List[string]
$seedPages | ForEach-Object { $allPages.Add($_) }

foreach ($page in $seedPages) {
  $html = Get-PageHtml $page

  foreach ($productMatch in [regex]::Matches($html, 'https://myheavenbeauty\.com/product/[^"''\s<>]+/')) {
    if (-not $allPages.Contains($productMatch.Value)) {
      $allPages.Add($productMatch.Value)
    }
  }
}

foreach ($page in ($allPages | Sort-Object -Unique)) {
  $html = Get-PageHtml $page
  if (-not $html) { continue }

  $imageUrls = Get-ImageUrlsFromHtml $html $page
  foreach ($imageUrl in $imageUrls) {
    if ($downloaded.Contains($imageUrl)) {
      continue
    }

    $group = Get-GroupForUrl $page $imageUrl
    $folder = Join-Path $OutputRoot $group
    Ensure-Directory $folder

    $uri = [Uri]$imageUrl
    $fileName = [IO.Path]::GetFileName($uri.AbsolutePath)
    if ([string]::IsNullOrWhiteSpace($fileName)) {
      $fileName = "$(Sanitize-Name $imageUrl).jpg"
    }
    $fileName = Sanitize-Name $fileName
    $target = Join-Path $folder $fileName

    try {
      Invoke-WebRequest -Uri $imageUrl -Headers $headers -OutFile $target -TimeoutSec 60
      $downloaded[$imageUrl] = $target
      $rows.Add([pscustomobject]@{
        Page = $page
        ImageUrl = $imageUrl
        File = $target
        Group = $group
      })
      Write-Host "Downloaded $imageUrl"
    } catch {
      Write-Warning "Could not download image: $imageUrl ($($_.Exception.Message))"
    }
  }
}

$mapPath = Join-Path $OutputRoot "IMAGE_UPLOAD_MAP.md"
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# Heaven Beauty Original Images")
$lines.Add("")
$lines.Add("Downloaded from the original website on $(Get-Date -Format 'yyyy-MM-dd HH:mm').")
$lines.Add("")
$lines.Add("## Where To Upload These In The New Dashboard")
$lines.Add("")
$lines.Add('- `01-home`: Admin -> Content -> Homepage sections.')
$lines.Add('  - Hero images: edit `home_hero`, upload into `Image upload` and `Second image upload`.')
$lines.Add('  - Showcase images: edit `home_image_showcase`, upload into `Image upload` and `Second image upload`.')
$lines.Add('- `02-our-story`: Admin -> Content -> Public pages -> edit `our-story`.')
$lines.Add('  - Founder / first portrait image: `Primary image upload`.')
$lines.Add('  - Product / story image: `Second image upload`.')
$lines.Add('- `04-products`: Admin -> Products -> edit the matching product.')
$lines.Add('  - Main product photo: `Main image upload`.')
$lines.Add("  - Extra product photos: product gallery image upload if you add/manage galleries.")
$lines.Add('- `00-brand`: project brand assets such as logo. Keep these in code unless you decide to make the logo editable later.')
$lines.Add("")
$lines.Add("## Downloaded Files")
$lines.Add("")
foreach ($row in $rows) {
  $relative = $row.File.Replace($OutputRoot, "").TrimStart([IO.Path]::DirectorySeparatorChar)
  $lines.Add("- ``$relative``")
  $lines.Add("  - Source page: $($row.Page)")
  $lines.Add("  - Source image: $($row.ImageUrl)")
}

Set-Content -LiteralPath $mapPath -Value $lines -Encoding UTF8

Write-Host ""
Write-Host "Done."
Write-Host "Folder: $OutputRoot"
Write-Host "Map: $mapPath"

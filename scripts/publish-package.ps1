param(
  [ValidateSet("check-login", "login", "build", "pack-preview", "publish", "publish-with-bump", "republish")]
  [string]$Action = "publish"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot

function Get-RelativePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BasePath,
    [Parameter(Mandatory = $true)]
    [string]$TargetPath
  )

  $baseFullPath = [System.IO.Path]::GetFullPath($BasePath)
  $targetFullPath = [System.IO.Path]::GetFullPath($TargetPath)

  if ([System.IO.Path].GetMethod("GetRelativePath", [type[]]@([string], [string]))) {
    return [System.IO.Path]::GetRelativePath($baseFullPath, $targetFullPath)
  }

  $baseUri = New-Object System.Uri(($baseFullPath.TrimEnd('\') + '\'))
  $targetUri = New-Object System.Uri($targetFullPath)
  $relativeUri = $baseUri.MakeRelativeUri($targetUri)
  return [System.Uri]::UnescapeDataString($relativeUri.ToString()).Replace('/', '\')
}

function Invoke-Npm {
  param(
    [string[]]$NpmArgs,
    [string]$WorkingDirectory
  )

  Push-Location $WorkingDirectory
  try {
    & npm @NpmArgs
    if ($LASTEXITCODE -ne 0) {
      throw "npm command failed: npm $($NpmArgs -join ' ')"
    }
  }
  finally {
    Pop-Location
  }
}

function Get-Packages {
  $packageFiles = Get-ChildItem -Path $workspaceRoot -Recurse -Filter "package.json" -File |
    Where-Object { $_.FullName -notmatch "[\\/]+node_modules[\\/]+" }

  $packages = foreach ($file in $packageFiles) {
    $packageJson = Get-Content $file.FullName -Raw | ConvertFrom-Json
    if (-not $packageJson.name) {
      continue
    }

    $directory = Split-Path $file.FullName -Parent
    [pscustomobject]@{
      Name = [string]$packageJson.name
      Version = [string]$packageJson.version
      Directory = $directory
      RelativePath = Get-RelativePath -BasePath $workspaceRoot -TargetPath $directory
    }
  }

  $packages | Sort-Object Name
}

function Select-Package {
  $packages = @(Get-Packages)

  if ($packages.Count -eq 0) {
    throw "No publishable packages found in workspace."
  }

  Write-Host ""
  Write-Host "Available packages:" -ForegroundColor Cyan

  for ($i = 0; $i -lt $packages.Count; $i++) {
    $pkg = $packages[$i]
    Write-Host ("[{0}] {1} ({2}) - {3}" -f ($i + 1), $pkg.Name, $pkg.Version, $pkg.RelativePath)
  }

  while ($true) {
    $selection = Read-Host "Enter package number"
    $index = 0

    if ([int]::TryParse($selection, [ref]$index) -and $index -ge 1 -and $index -le $packages.Count) {
      return $packages[$index - 1]
    }

    Write-Host "Invalid selection. Try again." -ForegroundColor Yellow
  }
}

function Select-VersionBump {
  $choices = @("patch", "minor", "major", "prerelease")

  Write-Host ""
  Write-Host "Version bump options:" -ForegroundColor Cyan

  for ($i = 0; $i -lt $choices.Count; $i++) {
    Write-Host ("[{0}] {1}" -f ($i + 1), $choices[$i])
  }

  while ($true) {
    $selection = Read-Host "Choose bump type"
    $index = 0

    if ([int]::TryParse($selection, [ref]$index) -and $index -ge 1 -and $index -le $choices.Count) {
      return $choices[$index - 1]
    }

    Write-Host "Invalid selection. Try again." -ForegroundColor Yellow
  }
}

function Assert-NpmLogin {
  Write-Host ""
  Write-Host "Checking npm login..." -ForegroundColor Cyan
  Invoke-Npm -NpmArgs @("whoami") -WorkingDirectory $workspaceRoot
}

switch ($Action) {
  "check-login" {
    Assert-NpmLogin
  }

  "login" {
    Invoke-Npm -NpmArgs @("login") -WorkingDirectory $workspaceRoot
  }

  "build" {
    $package = Select-Package
    Write-Host ""
    Write-Host "Building $($package.Name)..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("run", "build") -WorkingDirectory $package.Directory
  }

  "pack-preview" {
    $package = Select-Package
    Write-Host ""
    Write-Host "Building $($package.Name)..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("run", "build") -WorkingDirectory $package.Directory
    Write-Host ""
    Write-Host "Previewing npm package contents for $($package.Name)..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("pack", "--dry-run") -WorkingDirectory $package.Directory
  }

  "publish" {
    Assert-NpmLogin
    $package = Select-Package
    Write-Host ""
    Write-Host "Building $($package.Name)..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("run", "build") -WorkingDirectory $package.Directory
    Write-Host ""
    Write-Host "Publishing $($package.Name)..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("publish", "--access", "public") -WorkingDirectory $package.Directory
  }

  "publish-with-bump" {
    Assert-NpmLogin
    $package = Select-Package
    $bumpType = Select-VersionBump
    Write-Host ""
    Write-Host "Bumping $($package.Name) version with '$bumpType'..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("version", $bumpType, "--no-git-tag-version") -WorkingDirectory $package.Directory
    Write-Host ""
    Write-Host "Building $($package.Name)..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("run", "build") -WorkingDirectory $package.Directory
    Write-Host ""
    Write-Host "Publishing $($package.Name)..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("publish", "--access", "public") -WorkingDirectory $package.Directory
  }

  "republish" {
    Assert-NpmLogin
    $package = Select-Package
    $bumpType = Select-VersionBump
    Write-Host ""
    Write-Host "Bumping $($package.Name) version with '$bumpType'..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("version", $bumpType, "--no-git-tag-version") -WorkingDirectory $package.Directory
    Write-Host ""
    Write-Host "Building $($package.Name)..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("run", "build") -WorkingDirectory $package.Directory
    Write-Host ""
    Write-Host "Publishing $($package.Name)..." -ForegroundColor Green
    Invoke-Npm -NpmArgs @("publish", "--access", "public") -WorkingDirectory $package.Directory
  }
}

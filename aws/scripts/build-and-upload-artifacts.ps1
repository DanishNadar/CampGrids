[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$ArtifactsBucketName,

    [Parameter(Mandatory)]
    [string]$Region,

    [string]$Python = 'python'
)

$ErrorActionPreference = 'Stop'
$awsRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $awsRoot
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stageRoot = Join-Path ([System.IO.Path]::GetTempPath()) "campgrids-artifacts-$timestamp"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw 'AWS CLI v2 is required.'
}
if (-not (Get-Command $Python -ErrorAction SilentlyContinue)) {
    throw "Python command '$Python' was not found. Pass -Python with a usable Python 3.12 path."
}

New-Item -ItemType Directory -Path $stageRoot | Out-Null

function Publish-Zip {
    param(
        [Parameter(Mandatory)][string]$SourceDirectory,
        [Parameter(Mandatory)][string]$Key,
        [Parameter(Mandatory)][scriptblock]$Build
    )

    $name = [System.IO.Path]::GetFileNameWithoutExtension($Key)
    $staging = Join-Path $stageRoot $name
    $archive = Join-Path $stageRoot "$name.zip"
    New-Item -ItemType Directory -Path $staging | Out-Null
    & $Build $staging $SourceDirectory
    Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $archive -Force
    & aws s3 cp $archive "s3://$ArtifactsBucketName/$Key" --region $Region --sse AES256
    if ($LASTEXITCODE -ne 0) { throw "Upload failed for $Key." }
    Write-Output "Uploaded s3://$ArtifactsBucketName/$Key"
}

Publish-Zip -SourceDirectory (Join-Path $awsRoot 'account-api') -Key 'releases/campgrids-account-api.zip' -Build {
    param($staging, $source)
    New-Item -ItemType Directory -Path (Join-Path $staging 'app') | Out-Null
    Copy-Item -LiteralPath (Join-Path $source 'app/main.py') -Destination (Join-Path $staging 'app/main.py')
    Copy-Item -LiteralPath (Join-Path $source 'requirements.txt') -Destination (Join-Path $staging 'requirements.txt')
}

function Build-PythonLambda {
    param($staging, $source, $entryFile)
    & $Python -m pip install --disable-pip-version-check --no-compile --target $staging -r (Join-Path $source 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed for $source." }
    Copy-Item -LiteralPath (Join-Path $source $entryFile) -Destination (Join-Path $staging $entryFile)
}

Publish-Zip -SourceDirectory (Join-Path $awsRoot 'student-auth') -Key 'releases/campgrids-student-auth.zip' -Build {
    param($staging, $source)
    Build-PythonLambda $staging $source 'handlers.py'
}

Publish-Zip -SourceDirectory (Join-Path $awsRoot 'analytics-export') -Key 'releases/campgrids-analytics-export.zip' -Build {
    param($staging, $source)
    Build-PythonLambda $staging $source 'analytics_export.py'
}

Write-Output "Build staging directory retained for inspection: $stageRoot"

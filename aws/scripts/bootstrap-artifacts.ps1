[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Region,

    [string]$ProjectName = 'campgrids',

    [ValidateSet('dev', 'test', 'prod')]
    [string]$Environment = 'prod'
)

$ErrorActionPreference = 'Stop'
$awsRoot = Split-Path -Parent $PSScriptRoot
$template = Join-Path $awsRoot 'infrastructure/bootstrap-artifacts.yaml'
$stackName = "$ProjectName-$Environment-artifacts"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw 'AWS CLI v2 is required. Install it, run aws configure (or SSO login), then retry.'
}

& aws cloudformation deploy `
    --region $Region `
    --stack-name $stackName `
    --template-file $template `
    --parameter-overrides "ProjectName=$ProjectName" "Environment=$Environment"
if ($LASTEXITCODE -ne 0) { throw 'Artifact-bootstrap stack deployment failed.' }

$bucket = & aws cloudformation describe-stacks `
    --region $Region `
    --stack-name $stackName `
    --query "Stacks[0].Outputs[?OutputKey=='ArtifactBucketName'].OutputValue | [0]" `
    --output text
if ($LASTEXITCODE -ne 0 -or -not $bucket) { throw 'Could not read the artifact bucket output.' }

Write-Output "Artifact bucket ready: $bucket"
Write-Output 'Next: run .\aws\scripts\build-and-upload-artifacts.ps1 with this bucket name.'

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Region,

    [string]$StackName = 'campgrids-prod'
)

$ErrorActionPreference = 'Stop'
$awsRoot = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { throw 'AWS CLI v2 is required.' }

function StackOutput([string]$key) {
    $value = & aws cloudformation describe-stacks --region $Region --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='$key'].OutputValue | [0]" --output text
    if ($LASTEXITCODE -ne 0 -or -not $value -or $value -eq 'None') {
        throw "Missing stack output: $key. Deploy with EnableRedshift=true first."
    }
    return $value
}

$workgroup = StackOutput 'RedshiftWorkgroupName'
$secretArn = StackOutput 'RedshiftAdminSecretArn'
$sql = Get-Content -LiteralPath (Join-Path $awsRoot 'redshift/001_account_reporting.sql') -Raw
$statementId = & aws redshift-data execute-statement --region $Region --workgroup-name $workgroup `
    --database campgrids --secret-arn $secretArn --sql $sql --query Id --output text
if ($LASTEXITCODE -ne 0) { throw 'Could not submit the Redshift schema statement.' }

do {
    Start-Sleep -Seconds 2
    $status = & aws redshift-data describe-statement --region $Region --id $statementId --output json | ConvertFrom-Json
} while ($status.Status -in @('SUBMITTED', 'PICKED', 'STARTED'))

if ($status.Status -ne 'FINISHED') { throw "Redshift schema setup failed: $($status.Error)" }
Write-Output "Redshift analytics schema initialized in workgroup $workgroup."

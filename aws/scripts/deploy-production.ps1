[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Region,

    [Parameter(Mandatory)]
    [string]$ParameterFile,

    [string]$StackName = 'campgrids-prod',

    [switch]$RefreshApiInstances
)

$ErrorActionPreference = 'Stop'
$awsRoot = Split-Path -Parent $PSScriptRoot
$template = Join-Path $awsRoot 'infrastructure/campgrids-production.yaml'

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw 'AWS CLI v2 is required.'
}
if (-not (Test-Path -LiteralPath $ParameterFile)) {
    throw "Parameter file was not found: $ParameterFile"
}

$parameters = Get-Content -LiteralPath $ParameterFile -Raw | ConvertFrom-Json
$overrides = @(
    $parameters | ForEach-Object {
        if (-not $_.ParameterKey -or $null -eq $_.ParameterValue) {
            throw 'Each parameter file item must have ParameterKey and ParameterValue.'
        }
        "$($_.ParameterKey)=$($_.ParameterValue)"
    }
)

& aws cloudformation deploy `
    --region $Region `
    --stack-name $StackName `
    --template-file $template `
    --capabilities CAPABILITY_NAMED_IAM `
    --parameter-overrides $overrides
if ($LASTEXITCODE -ne 0) { throw 'CampGrids production stack deployment failed.' }

& aws cloudformation describe-stacks --region $Region --stack-name $StackName `
    --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' --output table
if ($LASTEXITCODE -ne 0) { throw 'Stack deployed but outputs could not be read.' }

if ($RefreshApiInstances) {
    $asg = & aws cloudformation describe-stacks --region $Region --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='ApiAutoScalingGroupName'].OutputValue | [0]" --output text
    if ($LASTEXITCODE -ne 0 -or -not $asg) { throw 'Could not find the API Auto Scaling Group output.' }
    & aws autoscaling start-instance-refresh --region $Region --auto-scaling-group-name $asg `
        --preferences MinHealthyPercentage=50,InstanceWarmup=300
    if ($LASTEXITCODE -ne 0) { throw 'Stack deployed but the API instance refresh did not start.' }
    Write-Output "Started rolling API refresh for $asg. Watch it with: aws autoscaling describe-instance-refreshes --auto-scaling-group-name $asg --region $Region"
}

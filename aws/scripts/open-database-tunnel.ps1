[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Region,

    [string]$StackName = 'campgrids-prod',

    [ValidateRange(1025, 65535)]
    [int]$LocalPort = 54321
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw 'AWS CLI v2 and the Session Manager plugin are required.'
}

$endpoint = & aws cloudformation describe-stacks --region $Region --stack-name $StackName `
    --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpoint'].OutputValue | [0]" --output text
$asg = & aws cloudformation describe-stacks --region $Region --stack-name $StackName `
    --query "Stacks[0].Outputs[?OutputKey=='ApiAutoScalingGroupName'].OutputValue | [0]" --output text
$instance = & aws autoscaling describe-auto-scaling-groups --region $Region --auto-scaling-group-names $asg `
    --query "AutoScalingGroups[0].Instances[?LifecycleState=='InService'].InstanceId | [0]" --output text
if ($LASTEXITCODE -ne 0 -or -not $endpoint -or -not $instance) {
    throw 'Could not find a healthy API instance and private database endpoint. Complete the stack deployment first.'
}

Write-Output "Opening an SSM tunnel on localhost:$LocalPort. Keep this terminal open, then use initialize-database.ps1 in a second terminal."
& aws ssm start-session --region $Region --target $instance `
    --document-name AWS-StartPortForwardingSessionToRemoteHost `
    --parameters "host=$endpoint,portNumber=5432,localPortNumber=$LocalPort"

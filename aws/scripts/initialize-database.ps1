[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Region,

    [string]$StackName = 'campgrids-prod',

    [ValidateRange(1025, 65535)]
    [int]$LocalPort = 54321
)

$ErrorActionPreference = 'Stop'
$awsRoot = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { throw 'AWS CLI v2 is required.' }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { throw 'PostgreSQL psql is required on this workstation.' }

function StackOutput([string]$key) {
    $value = & aws cloudformation describe-stacks --region $Region --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='$key'].OutputValue | [0]" --output text
    if ($LASTEXITCODE -ne 0 -or -not $value -or $value -eq 'None') { throw "Missing stack output: $key" }
    return $value
}

$masterSecretArn = StackOutput 'DatabaseMasterSecretArn'
$apiSecretArn = StackOutput 'ApiDatabaseSecretArn'
$studentSecretArn = StackOutput 'StudentAuthDatabaseSecretArn'
$analyticsSecretArn = StackOutput 'AnalyticsDatabaseSecretArn'

$master = (& aws secretsmanager get-secret-value --region $Region --secret-id $masterSecretArn --query SecretString --output text | ConvertFrom-Json)
$api = (& aws secretsmanager get-secret-value --region $Region --secret-id $apiSecretArn --query SecretString --output text | ConvertFrom-Json)
$student = (& aws secretsmanager get-secret-value --region $Region --secret-id $studentSecretArn --query SecretString --output text | ConvertFrom-Json)
$analytics = (& aws secretsmanager get-secret-value --region $Region --secret-id $analyticsSecretArn --query SecretString --output text | ConvertFrom-Json)

$psqlArgs = @('--host', '127.0.0.1', '--port', $LocalPort, '--username', $master.username, '--dbname', 'campgrids', '--set', 'ON_ERROR_STOP=1')
$env:PGPASSWORD = $master.password
try {
    $alreadyInitialized = & psql @psqlArgs --tuples-only --no-align --command "select to_regclass('campgrids.accounts') is not null;"
    if (($alreadyInitialized | Out-String).Trim() -eq 't') {
        throw 'The RDS schema already exists. This one-time initializer refuses to rerun it; use reviewed versioned migrations for an existing environment.'
    }

    foreach ($credential in @($api, $student, $analytics)) {
        $role = $credential.username
        if ($role -notmatch '^[a-z][a-z0-9_]{2,62}$') { throw "Unexpected generated database role name: $role" }
        $roleSql = 'DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''' + $role + ''' ) THEN CREATE ROLE ' + $role + ' LOGIN; END IF; END $$; ALTER ROLE ' + $role + ' PASSWORD :''role_password'';'
        & psql @psqlArgs --set "role_password=$($credential.password)" --command $roleSql
        if ($LASTEXITCODE -ne 0) { throw "Could not create/update database role $role." }
    }

    foreach ($migration in @('001_account_source_of_truth.sql', '002_core_application_schema.sql', '003_runtime_roles.sql')) {
        $path = Join-Path $awsRoot "rds/$migration"
        & psql @psqlArgs --file $path
        if ($LASTEXITCODE -ne 0) { throw "Migration failed: $migration" }
    }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Output 'RDS schema and least-privilege runtime roles are initialized. Start/refresh the API Auto Scaling Group now; it will become healthy once it can connect with campgrids_api.'

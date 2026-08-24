$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Require-Text([string]$Path, [string]$Pattern, [string]$Name) {
  $text = Get-Content -LiteralPath (Join-Path $root $Path) -Raw -Encoding UTF8
  if ($text -notmatch $Pattern) { throw "Missing $Name in $Path" }
}

Require-Text 'web/src/components/layout/app-shell.tsx' 'workspacePicker' 'workspace picker'
Require-Text 'web/src/app/(app)/du-an/[projectId]/page.tsx' 'V2ModuleSettingsForm' 'project workspace dashboard'
Require-Text 'web/src/lib/v2-access.ts' 'members:\s*\{\s*some:\s*\{\s*userId' 'manager membership boundary'
Require-Text 'web/src/lib/v2-workspace-actions.ts' 'user\.role !== "ADMIN"' 'admin-only module setting'
Require-Text 'web/src/lib/v2-project-types.ts' 'PROJECT_TYPES' 'shared project types'

$actions = Get-Content -LiteralPath (Join-Path $root 'web/src/lib/v2-project-actions.ts') -Raw -Encoding UTF8
if ($actions -match 'export\s+(const|type)\s+PROJECT_TYPES') { throw 'PROJECT_TYPES must not be exported from a use-server module' }

$gitStatus = git -C $root status --short
if ($gitStatus -match '\.env|qa-role-credentials|qa-chrome-profile') { throw 'Secret or QA credential artifact appears in status' }

Write-Output 'V2_WORKSPACE_BOUNDARY_PASS'

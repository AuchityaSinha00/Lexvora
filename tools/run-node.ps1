$nodeCandidates = @(
  "C:\Users\auchi\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\OpenAI\Codex\bin\node.exe",
  "C:\Users\auchi\Documents\Codex\2026-06-02\create-a-game-apk-which-is\tools\node\node-v24.16.0-win-x64\node.exe"
)

$node = $nodeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $node) {
  Write-Error "No accessible Node.js runtime was found. Install Node.js from https://nodejs.org or update tools/run-node.ps1."
  exit 1
}

& $node @args
exit $LASTEXITCODE

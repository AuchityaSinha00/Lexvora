.\tools\run-node.ps1 --check server.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

.\tools\run-node.ps1 --check script.js
exit $LASTEXITCODE

# 静的サイトをローカルで確認する（blog/posts.json の fetch などに必要）
# 使い方: リポジトリ直下で .\serve.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$port = 8080
Write-Host ""
Write-Host "  http://localhost:$port/  をブラウザで開いてね（Ctrl+C で停止）" -ForegroundColor Cyan
Write-Host ""
if (Get-Command python -ErrorAction SilentlyContinue) {
  python -m http.server $port
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
  py -3 -m http.server $port
} else {
  Write-Error "python が見つかりません。Python を入れるか、PATH を通してからもう一度試してね。"
}

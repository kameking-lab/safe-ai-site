$ErrorActionPreference = "Continue"
$base = "https://www.anzen-ai-portal.jp"
$paths = @(
  "/","/chatbot","/chemical-ra","/equipment-finder","/quiz","/exam-quiz",
  "/accidents","/laws","/law-search","/stats","/contact",
  "/signage","/signage/map","/signage/display","/safety-diary","/ky",
  "/features","/wizard","/lms","/chatbot-eval","/about/chatbot-eval",
  "/chemical-database","/circulars","/laws/notices-precedents","/qa-knowledge",
  "/risk","/risk-prediction","/e-learning","/diversity","/mental-health",
  "/glossary","/goods","/subsidies","/notifications","/about",
  "/privacy","/terms","/security","/dpa","/bcp","/leaflet","/pdf",
  "/account","/auth/signin","/robots.txt","/sitemap.xml"
)
$out = @()
foreach ($p in $paths) {
  $url = "$base$p"
  # Use curl.exe; -o gets body, -s silent, -L follow, -w outputs format
  $resp = & curl.exe -s -o NUL -w "%{http_code}|%{size_download}|%{url_effective}|%{redirect_url}" --max-time 30 -L $url 2>&1
  $parts = $resp -split "\|"
  $out += [pscustomobject]@{
    path = $p
    status = if ($parts.Count -gt 0) { $parts[0] } else { "ERR" }
    size = if ($parts.Count -gt 1) { $parts[1] } else { "" }
    final = if ($parts.Count -gt 2) { $parts[2] } else { "" }
  }
}
$out | ForEach-Object { "$($_.path)`t$($_.status)`t$($_.size)`t$($_.final)" }

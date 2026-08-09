# Answer-first Preview result（2026-08-03 JST基準）

- Status: PENDING（current candidate）
- Source verification: 2026-08-09 JST
- Full gate: PASS、123 critical suites、failed check IDs 0
- Local fixed conversation: JSON / SSE / legacy 12ケース、通常30応答 PASS
- Required Preview boundaries: SSO、全path noindex/nofollow/noarchive、robots Disallow、Analytics/RUM/Service Worker停止、メールdry-run、production不変
- Required Preview conversation: API・390×844実ブラウザー各12ケース

旧PreviewのDeployment IDはcurrent candidateの結果として再利用しない。新しいGit Previewを1回だけ作成し、検証後に実ID・Build ID・commit・実測値を記録する。

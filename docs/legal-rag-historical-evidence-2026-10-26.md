# 旧RAG検証の保存先

旧検証JSON5件は、公開候補の非runtime JSON/image数上限125件を保つため、重複同梱から外した。ガードの上限・対象は変更していない。検証結果は変更せず、元commit `db0b708dbad4b290d09be1e7de93972edf2c700f` と作業領域 `rag-historical-evidence-20261026/` にbyte一致で保持した。旧760件と全体型検査のPASSはこの歴史的候補の結果であり、新候補の全体PASSではない。

| 元docsファイル | bytes | SHA256 |
|---|---:|---|
| `legal-rag-baseline-comparison-2026-10-26.json` | 407 | `46b3b12e088899e665d3da58feaf6787cc54fd95e72f7490a61fc4067e7bbf92` |
| `legal-rag-five-law-mvp-test-results-2026-10-26.json` | 2203 | `d8f17fe5f838349487aa35856d3207cf8b7b8a3e417bd3e4c1c9dec819a487d8` |
| `legal-rag-five-law-xml-verification-2026-10-26.json` | 9699 | `34a47df3ea46b26d60849b91978c164997c7fa97edacb63acee76ad985e94d00` |
| `legal-rag-local-test-results-2026-10-26.json` | 1977 | `604ebd8032ed8779cb8d817549bf3d75d6d86e53b7836db966819336959bf74e` |
| `legal-rag-supplement-test-results-2026-10-26.json` | 2342 | `a8fc4584651b7285a8e1de0b06c5dfff6eeee4c0af8b9f7623106246076a80b3` |

必要時は `git show db0b708d:docs/<上表のファイル名>` で原文を読める。全体の元候補は `codex/legal-rag-five-law-mvp-20261026` に保持。新候補の検査は [配備準備](legal-rag-release-readiness-2026-10-27.md) を参照。

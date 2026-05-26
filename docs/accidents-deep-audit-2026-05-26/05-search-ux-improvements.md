# 05 検索UX強化（軸5）

## 現状
- /accidents は HomeScreen(variant=accidents) のタブUI（mhlw-search 等）。/api/mhlw/search で事故検索。
- /accidents-reports は HubFilter で業種絞り込み。
- chemical/accident-cross-search（物質名→事故、P1-3）あり。

## 改善余地
- S-1 フリーキーワード＋多軸AND絞り込み（業種＋事故型＋被害程度＋年代）を1画面で。現状はタブ/単軸寄り。
- S-2 関連事故サジェスト（accident-related.ts あり→詳細ページで「類似事故」表示の強化）。
- S-3 ゼロ件フォールバック（職場のあんぜんサイトへの誘導＋AIに事故傾向を尋ねる導線）。
- S-4 検索条件の保存・履歴（localStorage、ra-cloud パターン流用可）。

## 優先度
- P1: 多軸AND絞り込みUI、関連事故サジェスト強化。
- P2: 保存検索・履歴（localStorage）。

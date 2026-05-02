# パッケージマネージャー戦略決定レポート

**作成日:** 2026-05-02  
**背景:** 14時間ビルドエラーの根本原因分析と再発防止策の決定

---

## 1. 現状の問題

### 1.1 ファイル共存状況

| ファイル | パス | サイズ | 行数 | lockfile仕様 |
|----------|------|--------|------|-------------|
| `package-lock.json` | `web/package-lock.json` | 488,677 bytes | 13,555行 | lockfileVersion 3 (npm 7+) |
| `pnpm-lock.yaml` | `web/pnpm-lock.yaml` | 292,695 bytes | 8,641行 | lockfileVersion '9.0' (pnpm 9.x) |

`.gitignore` にはどちらも除外設定なし。

### 1.2 各ファイルの追加経緯

| 日付 | コミット | 内容 |
|------|----------|------|
| 2026-03-30 | `9bcfe5b` | `Fix web folder tracking` — package-lock.json 追加（npm 初期設定） |
| 2026-04-15 | `1a4ab09` | `feat(signage): enhance today-documents with PDF support` — pnpm-lock.yaml 追加（pdfjs-dist を `pnpm install` で追加時に混入） |
| 2026-05-02 | `32d34d1` | `fix(vercel): force npm install` — vercel.json に `"installCommand": "npm ci"` を追加（今回のインシデント対応） |

### 1.3 インシデントの根本原因

```
pdfjs-dist を pnpm install で追加
  → web/pnpm-lock.yaml がリポジトリに混入
  → Vercel が pnpm-lock.yaml を検出して自動的に pnpm 環境に切り替え
  → package.json に packageManager フィールドなし、pnpm バージョン不定
  → pnpm と package.json の不整合でビルドエラー
  → 14時間のデバッグ
```

### 1.4 現在の各環境のパッケージマネージャー

| 環境 | 使用ツール | 根拠 |
|------|-----------|------|
| GitHub Actions (e2e.yml) | npm | `npm ci` + `cache-dependency-path: web/package-lock.json` |
| GitHub Actions (web-ci.yml) | npm | 同上 |
| Vercel (main ブランチ) | npm | `vercel.json: "installCommand": "npm ci"` |
| 開発ローカル | **不定** | package.json に `packageManager` フィールドなし |

**問題の核心:** CI/CD はすべて npm に統一されているが、ローカル開発では pnpm が誤って使われる可能性を排除できていない。

---

## 2. package.json の状態

```json
{
  "name": "web",
  "scripts": {
    "check:ci": "npm run lint && npm run build && npm run test && npm run test:e2e:ci"
  }
}
```

- `packageManager` フィールド: **未定義**
- `engines` フィールド: **未定義**
- scripts はすべて `npm run` 前提で記述

---

## 3. A/B/C 案の比較

### A. npm 統一案（推奨）

**内容:** `web/pnpm-lock.yaml` を削除、`.gitignore` に追記、`package.json` に `packageManager` 宣言追加

| 項目 | 評価 |
|------|------|
| 変更ファイル数 | 2ファイル（.gitignore + package.json）+ 削除1件 |
| CI/CD 変更 | 不要（すでに npm） |
| vercel.json 変更 | 不要（すでに `npm ci`） |
| 今後の混入リスク | `.gitignore` + `packageManager` 宣言で防止 |
| 開発者への影響 | `npm install` を使うよう周知のみ |
| npm のバージョン | Node.js 20 に同梱（追加インストール不要） |

**メリット:**
- 変更量が最小（削除1件 + 追記2箇所）
- CI/CD・Vercel の設定変更ゼロ
- `packageManager: "npm@10.x"` 宣言により Corepack がバージョンを固定
- 再発防止: `.gitignore` で pnpm-lock.yaml の混入を恒久的にブロック

**デメリット:**
- pnpm の速度・厳格な依存解決を失う（ただし現時点で未活用）
- npm install は pnpm install より約 20-30% 遅い（規模的に許容範囲）

---

### B. pnpm 統一案

**内容:** `web/package-lock.json` を削除、GitHub Actions 2ファイル + vercel.json を pnpm 対応に変更

| 項目 | 評価 |
|------|------|
| 変更ファイル数 | 5ファイル（workflows 2 + vercel.json + package.json + .gitignore）+ 削除1件 |
| CI/CD 変更 | 必要（setup-node の cache 設定、npm ci → pnpm install --frozen-lockfile） |
| vercel.json 変更 | 必要（installCommand を `pnpm install --frozen-lockfile` に変更） |
| 今後の混入リスク | package.json の `packageManager` 宣言で防止 |

**メリット:**
- pnpm の厳格な依存解決（幽霊依存を防ぐ）
- lockfile サイズが小さい（package-lock.json 比 40% 削減）

**デメリット:**
- 変更ファイル数が多く、リグレッションリスクが高い
- Vercel での pnpm 設定に追加の検証が必要
- インシデント対応直後に大きな変更を加えるリスク
- pnpm の厳格性は現時点で恩恵を受けていない

---

### C. 現状維持案

**内容:** 両 lockfile を残し、`vercel.json: installCommand: "npm ci"` で Vercel の pnpm 自動検出を抑制

| 項目 | 評価 |
|------|------|
| 変更ファイル数 | 0 |
| CI/CD 変更 | 不要 |
| 再発リスク | **高い** |

**メリット:**
- 即時作業ゼロ

**デメリット:**
- pnpm-lock.yaml が再度更新されると Vercel の挙動が変わる可能性
- 開発者が `pnpm install` を実行するたびに不整合が広がる
- `vercel.json` の `installCommand` が削除・変更された際に再発
- コードベースを見た第三者が混乱する
- 根本解決ではなく「封じ込め」に過ぎない

---

## 4. 推奨案: **A（npm 統一案）**

### 推奨理由

1. **事実ベース:** CI/CD 3環境（e2e.yml、web-ci.yml、Vercel）すべてがすでに npm を使用。npm への統一は「設定」ではなく「宣言の追いつき」に過ぎない。

2. **変更最小:** 削除1件 + 追記2箇所。今回のインシデント対応直後に大規模変更を加えるリスクを避ける。

3. **再発防止の確実性:** `.gitignore` に `web/pnpm-lock.yaml` を追加することで、`pnpm install` を誤って実行してもコミットできなくなる。`packageManager` 宣言により Corepack が npm 以外の使用を警告。

4. **pnpm のメリットが未活用:** monorepo workspaces、strict な幽霊依存チェックなど pnpm の強みは現プロジェクト構成で活かされていない。

---

## 5. 実装手順（実行はしない）

### Step 1: pnpm-lock.yaml を削除

```bash
git rm web/pnpm-lock.yaml
```

### Step 2: .gitignore に pnpm-lock.yaml を追加

`/.gitignore` の `# Build artifacts` セクション付近に追記:

```
# pnpm lockfile (このプロジェクトはnpm統一)
web/pnpm-lock.yaml
pnpm-lock.yaml
```

### Step 3: package.json に packageManager フィールドを追加

`web/package.json` の先頭付近に追加:

```json
"packageManager": "npm@10.9.2",
```

> npm のバージョンは `npm --version` で確認して合わせる。

### Step 4: ビルド確認

```bash
cd web && npm ci && npm run build && npm run lint
```

### Step 5: コミット

```bash
git add web/package.json .gitignore
git commit -m "chore: npm統一 — pnpm-lock.yaml削除・gitignore追加・packageManager宣言"
```

---

## 6. 補足: Vercel の lockfile 自動検出仕様

Vercel は以下の優先順位でパッケージマネージャーを自動検出する:

1. `bun.lockb` → bun
2. `pnpm-lock.yaml` → pnpm  ← **今回の混入がトリガー**
3. `yarn.lock` → yarn
4. `package-lock.json` → npm

`installCommand` を明示することで自動検出を上書きできるが、lockfile の混在自体を解消するのが根本対策。

---

*診断: Claude Sonnet 4.6 / 2026-05-02*

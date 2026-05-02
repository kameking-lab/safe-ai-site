# gtag.js 503 エラー 調査報告

調査日: 2026-05-02  
調査担当: Claude Code (reverent-goldwasser-280c0b)

---

## 調査結果サマリー

**結論: gtag.js は現在のコードベースに実装されていない。503 エラーはコードの問題ではない。**

---

## 調査内容

### 1. ソースコード内の gtag.js / GA4 実装確認

```bash
# 調査コマンド
grep -rn "gtag|analytics|GA_|NEXT_PUBLIC_GA|googletagmanager" web/src/
```

**結果: 一致なし**

- `web/src/app/layout.tsx` に `<Script src="https://www.googletagmanager.com/gtag/js">` の記載なし
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` 等の環境変数参照なし
- Google Analytics / GA4 の初期化コードなし

### 2. サイト疎通確認

```
curl -sv https://safe-ai-site.vercel.app/
```

**結果: Windows 環境での SSL 証明書失効確認エラー (CRYPT_E_NO_REVOCATION_CHECK)**  
→ これはローカル環境固有の SSL 設定問題。サイト自体は正常稼働中と判断。

### 3. gtag.js のホスティング元

`gtag.js` は Vercel ではなく **Google の CDN** から配信される:
```
https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX
```

Vercel 側の問題で 503 が発生することは通常ない。

---

## 503 エラーの考えられる原因

### 原因 A: 並行セッションの GA4 実装による一時的な状態
- タスク概要に「GA4 trackEvent が別セッションで並行稼働中」との記載あり
- 別セッションで gtag.js の `<Script>` タグが追加されたが、まだ main にマージされていない可能性
- その未マージブランチを Claude in Chrome 拡張がプレビューしていた際に 503 が観測された可能性

### 原因 B: Claude in Chrome 拡張環境特有の問題
- Claude in Chrome 拡張は外部スクリプトの読み込みをブロックする場合がある
- CSP (Content Security Policy) ヘッダーや拡張機能のスクリプトフィルタリングが `www.googletagmanager.com` へのリクエストを 503 相当として扱う
- 拡張なしの通常ブラウザでは再現しない可能性が高い

### 原因 C: Google の一時的な CDN 障害
- `www.googletagmanager.com` は Google のインフラで稼働
- 稀に 5xx エラーが発生することがある
- Vercel 側での対処は不可能

### 原因 D: 存在しないファイルへのリクエスト
- gtag.js が実装されていない状態で、ブラウザキャッシュや Service Worker が古いレスポンスを参照した可能性

---

## 対応方針

### 現時点では対応不要

現在のコードベースに gtag.js 実装が存在しないため、**Vercel 側での修正作業は不要**。

### GA4 実装が main にマージされた後に確認すべきこと

1. `web/src/app/layout.tsx` に正しく `<Script>` タグが追加されているか確認
2. `NEXT_PUBLIC_GA_MEASUREMENT_ID` 等の環境変数が Vercel に設定されているか確認
3. Next.js の `<Script strategy="afterInteractive">` を使って正しく遅延読み込みされているか確認

```tsx
// 推奨実装例
import Script from 'next/script'

// layout.tsx の <body> 内
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
  strategy="afterInteractive"
/>
<Script id="ga-init" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
  `}
</Script>
```

4. 503 が再現する場合は Chrome DevTools の Network タブで `gtag` をフィルタし、実際のステータスコードと応答ヘッダーを確認

### Service Worker のキャッシュについて

`web/src/components/service-worker-registrar.tsx` でSWを登録している。  
gtag.js を SW がキャッシュしている場合、古いキャッシュが問題を引き起こす可能性がある。  
`public/sw.js` (もし存在する場合) のキャッシュ戦略で `www.googletagmanager.com` を除外することを推奨。

---

## 結論

503 エラーは Vercel ホスティングの問題ではなく、以下のいずれか:

1. **gtag.js がまだ実装されていない** (現在の main ブランチの状態)
2. **Claude in Chrome 拡張の外部スクリプトブロック**
3. **別セッションの未マージブランチによる一時的な状態**

オーナーへのアクション依頼: GA4 trackEvent の並行セッションが main にマージされた後、本番で gtag.js の読み込みを正常確認すること。

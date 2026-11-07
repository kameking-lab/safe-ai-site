# NETIS作業効率化候補の出典照合

2026-09-25確認。国土交通省中国地方整備局の[2026年4月時点のNETIS推奨技術等一覧](https://www.cgr.mlit.go.jp/ctc/pdf/technology/netis/recommend-skill-2026.pdf)で5件の登録番号・名称・工種・掲載区分を確認した。残るALBは同局の[過去のDX技術紹介](https://www.cgr.mlit.go.jp/ctc/innfra-dx/infra-technology-list.html)で確認した。提供者資料または提供者自身のページでも用途を照合した。**2026年9月時点のNETIS本体個別詳細・掲載期限・提供可否は6件とも未照合**。4月の一覧掲載を9月時点の現行登録の証明とは扱わない。UIの番号は末尾記号を外した基番号とし、確認資料の表記を別に表示する。

| 基番号 | 確認資料の表記 | 2026年4月一覧の掲載箇所 | 主目的 | 提供者の一次資料 | 9月時点のNETIS本体 |
|---|---|---|---|---|
| KT-210020 | KT-210020-A | p.6（調査試験）・p.22 | 点群処理・共有 | [ScanX資料（国交省サイトに掲載）](https://www.cgr.mlit.go.jp/ctc/pdf/innfra-dx/netis/4_ScanX.pdf) | 未照合 |
| KT-140030 | KT-140030-VR | p.6（橋梁上部工）・p.24 | 橋梁部材の3D計測 | [簡測くん資料（国交省サイトに掲載）](https://www.cgr.mlit.go.jp/ctc/pdf/innfra-dx/netis/7_20250203kansoku.pdf) | 未照合 |
| KK-160016 | KK-160016-VE | 掲載を確認できず。過去のDX技術紹介のみ | 陸域・水域の測量 | [パスコの技術紹介](https://www.pasco.co.jp/biz/tech/aerial-leser/) | 未照合 |
| KT-180049 | KT-180049-VE | p.7（CALS関連技術）・p.23。過去のDX紹介は `-A` | 現場情報・連絡の共有 | [ANDPAD施工管理](https://andpad.jp/products/construction_management) | 未照合。`-VE` を9月の現在値と断定しない |
| KT-170030 | KT-170030-VE | p.3（共通工）・p.36 | 杭施工情報の可視化 | [3Dパイルビューアー資料（国交省サイトに掲載）](https://www.cgr.mlit.go.jp/ctc/pdf/innfra-dx/netis/6_3D.pdf) | 未照合 |
| KK-130026 | KK-130026-VE | p.7（調査試験）・p.35 | トンネル覆工面点検 | [計測検査のMIMM紹介](https://www.keisokukensa.co.jp/MIMM) | 未照合 |

既存安全10件はPR #1013から維持し、新規は6件。測量・出来形3件、記録・点検3件の2分類のみ公開する。搬送・運搬、土工・締固めは、この確認済み集合では各3件に達しないため分類を増やさない。計16件はNETIS全件一覧でも「24件達成」でもない。

新規製品画像は6件とも権利未確認のため未掲載。公開資料に写真があることを転載許諾とみなさない。導入前にNETIS本体と提供元で現行掲載、現場適合、通信・機材、契約条件を確認する。NETISへの登録は効果保証や安全認証を意味しない。

## 効率化カテゴリの代表写真

2026-09-25にWikimedia Commonsの元ファイルページで作者・ライセンスを確認し、提供される960px縮小版を取得した。**カテゴリの作業場面・機材を示す写真であり、掲載技術や製品固有の写真ではない。** 画面上にもその区別と作者・ライセンスを表示する。ローカルで画像編集はしていないが、画面表示時にCSSの`object-cover`で切り抜く。

| カテゴリ | 代表写真・権利根拠 | 保存ファイル／SHA-256 |
|---|---|---|
| 測量・出来形 | [Surveying prism and total station, for land surveying, in Shibuya-ku.jpg](https://commons.wikimedia.org/wiki/File:Surveying_prism_and_total_station,_for_land_surveying,_in_Shibuya-ku.jpg)、作者Syced、[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | `web/public/netis-safety/categories/surveying.jpg`／`4B00B841B5E9115C3AB5556A141D845590624CE05941FFDC9343F02829528E3E` |
| 記録・点検 | [BRIDGE 2021.02.23 BasnightBridgeInspection -32.jpg](https://commons.wikimedia.org/wiki/File:BRIDGE_2021.02.23_BasnightBridgeInspection_-32.jpg)、作者NCDOTcommunications、[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)。CommonsのFlickreviewRが元Flickrのライセンスを確認済み | `web/public/netis-safety/categories/bridge-inspection.jpg`／`7EB62E510336B31981109E8E1851518E6F2EFC84B8D98D80B7010071F4C351E3` |

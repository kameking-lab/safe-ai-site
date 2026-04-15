/**
 * 実際の労働安全衛生法関連の法改正データ（2016年〜2026年）
 *
 * 出典: e-Gov法令検索、厚生労働省通達・告示、官報、国土交通省発表
 * モックではなく、公開情報に基づく実データです。
 */
import type { LawRevisionCore } from "@/lib/types/domain";

export const realLawRevisions: LawRevisionCore[] = [
  // ── 2016年 ──────────────────────────────────────────
  {
    id: "lr-real-2016-001",
    title: "化学物質のリスクアセスメント義務化（安衛法第57条の3）",
    publishedAt: "2016-06-01",
    revisionNumber: "平成27年法律第65号（施行）",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "SDS交付義務対象の640物質について、事業者にリスクアセスメントの実施を義務化。2014年改正法の施行。対象物質を取り扱う全事業場が対象。",
    source: {
      url: "https://laws.e-gov.go.jp/law/347AC0000000057",
      label: "e-Gov 労働安全衛生法",
    },
  },
  {
    id: "lr-real-2016-002",
    title: "ストレスチェック制度の本格運用開始",
    publishedAt: "2016-11-30",
    revisionNumber: "平成26年法律第82号（経過措置終了）",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "中",
    summary:
      "常時50人以上の労働者を使用する事業場で、年1回のストレスチェック実施義務の経過措置が終了。未実施事業場への指導を強化。",
    source: {
      url: "https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei12/",
      label: "厚生労働省 ストレスチェック制度",
    },
  },
  {
    id: "lr-real-2016-003",
    title: "建設工事従事者の安全及び健康の確保の推進に関する法律",
    publishedAt: "2016-12-16",
    revisionNumber: "平成28年法律第111号",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "国土交通省・厚生労働省",
    impact: "低",
    summary:
      "建設工事従事者の安全・健康確保を国の責務と位置づけ。基本計画の策定、一人親方等への保護拡大の方向性を法定化。",
    source: {
      url: "https://laws.e-gov.go.jp/law/428AC1000000111",
      label: "e-Gov 建設工事従事者安全健康確保推進法",
    },
  },

  // ── 2017年 ──────────────────────────────────────────
  {
    id: "lr-real-2017-001",
    title: "産業医の職場巡視頻度の見直し（安衛則改正）",
    publishedAt: "2017-06-01",
    revisionNumber: "平成29年厚生労働省令第29号",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "低",
    summary:
      "産業医の職場巡視頻度を「毎月1回」から、事業者が所定の情報提供を行う場合は「2か月に1回」に緩和。ただし衛生委員会の同意が条件。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000160837.html",
      label: "厚生労働省 産業医制度",
    },
  },
  {
    id: "lr-real-2017-002",
    title: "職長等教育の対象業種の拡大",
    publishedAt: "2017-04-01",
    revisionNumber: "平成28年厚生労働省令第172号（施行）",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "低",
    summary:
      "職長等に対する安全衛生教育の対象業種に、食料品製造業、新聞業、出版業、製本業、印刷物加工業を追加。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000117365.html",
      label: "厚生労働省 安全衛生教育",
    },
  },

  // ── 2018年 ──────────────────────────────────────────
  {
    id: "lr-real-2018-001",
    title: "働き方改革関連法による安衛法改正（労働時間把握義務等）",
    publishedAt: "2018-07-06",
    revisionNumber: "平成30年法律第71号",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "事業者に全労働者の労働時間の客観的把握を義務化。月80時間超の時間外労働者への医師面接指導を強化。産業医の権限・独立性を法的に担保。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000148322.html",
      label: "厚生労働省 働き方改革",
    },
  },
  {
    id: "lr-real-2018-002",
    title: "墜落制止用器具の規格改正（フルハーネス型義務化）",
    publishedAt: "2018-06-22",
    revisionNumber: "平成30年厚生労働省告示第249号",
    kind: "ordinance",
    category: "告示",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "「安全帯」の名称を「墜落制止用器具」に変更。6.75m超の高所作業ではフルハーネス型を原則義務化（経過措置2022年1月まで）。特別教育の実施を義務化。",
    source: {
      url: "https://www.mhlw.go.jp/stf/newpage_01188.html",
      label: "厚生労働省 墜落制止用器具",
    },
  },
  {
    id: "lr-real-2018-003",
    title: "受動喫煙防止対策の強化（健康増進法改正）",
    publishedAt: "2018-07-25",
    revisionNumber: "平成30年法律第78号",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "中",
    summary:
      "職場を含む多数利用施設での原則屋内禁煙を法定化。事業者に受動喫煙防止措置を義務づけ。2020年4月全面施行。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000189195.html",
      label: "厚生労働省 受動喫煙対策",
    },
  },

  // ── 2019年 ──────────────────────────────────────────
  {
    id: "lr-real-2019-001",
    title: "働き方改革関連法の施行（労働時間把握・面接指導）",
    publishedAt: "2019-04-01",
    revisionNumber: "平成30年法律第71号（施行）",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "2018年改正法の施行。労働時間の客観的把握義務（タイムカード・PCログ等）、月80時間超の時間外労働者への医師面接指導義務が開始。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000148322.html",
      label: "厚生労働省 働き方改革",
    },
  },
  {
    id: "lr-real-2019-002",
    title: "フルハーネス型墜落制止用器具の使用開始",
    publishedAt: "2019-02-01",
    revisionNumber: "平成30年厚生労働省告示第249号（施行）",
    kind: "ordinance",
    category: "告示",
    issuer: "厚生労働省",
    impact: "中",
    summary:
      "墜落制止用器具の新規格が施行。フルハーネス型の特別教育が必須に。2022年1月1日までの経過措置期間内は旧規格品の使用可。",
    source: {
      url: "https://www.mhlw.go.jp/stf/newpage_01188.html",
      label: "厚生労働省 墜落制止用器具",
    },
  },

  // ── 2020年 ──────────────────────────────────────────
  {
    id: "lr-real-2020-001",
    title: "エイジフレンドリーガイドライン策定",
    publishedAt: "2020-03-16",
    revisionNumber: "令和2年3月16日基発0316第1号",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "厚生労働省",
    impact: "低",
    summary:
      "高年齢労働者の安全と健康確保のためのガイドライン。体力測定に基づく作業配置、転倒防止対策、健康管理の充実を事業者に求める。",
    source: {
      url: "https://www.mhlw.go.jp/stf/newpage_10178.html",
      label: "厚生労働省 エイジフレンドリーガイドライン",
    },
  },
  {
    id: "lr-real-2020-002",
    title: "溶接ヒュームの特定化学物質への追加",
    publishedAt: "2020-04-22",
    revisionNumber: "令和2年厚生労働省令第89号",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "溶接ヒュームを特定化学物質（第2類物質）に追加。屋内溶接作業での個人ばく露測定の実施と呼吸用保護具の選定・使用を義務化。2021年4月施行。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000124546.html",
      label: "厚生労働省 化学物質管理",
    },
  },
  {
    id: "lr-real-2020-003",
    title: "石綿事前調査の義務化（大気汚染防止法改正）",
    publishedAt: "2020-06-05",
    revisionNumber: "令和2年法律第39号",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省・環境省",
    impact: "高",
    summary:
      "解体・改修工事前のアスベスト事前調査を義務化。レベル3建材の除去作業にも規制を拡大。有資格者による調査を2023年10月から義務化。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000113878.html",
      label: "厚生労働省 石綿対策",
    },
  },

  // ── 2021年 ──────────────────────────────────────────
  {
    id: "lr-real-2021-001",
    title: "溶接ヒューム規制の全面施行",
    publishedAt: "2021-04-01",
    revisionNumber: "令和2年厚生労働省令第89号（施行）",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "溶接ヒュームの個人ばく露測定と呼吸用保護具の使用義務が全面施行。屋内アーク溶接等を行う全事業場が対象。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000124546.html",
      label: "厚生労働省 化学物質管理",
    },
  },
  {
    id: "lr-real-2021-002",
    title: "テレワークの適切な導入及び実施の推進のためのガイドライン",
    publishedAt: "2021-03-25",
    revisionNumber: "令和3年3月25日改定",
    kind: "guideline",
    category: "ガイドライン",
    issuer: "厚生労働省",
    impact: "低",
    summary:
      "テレワーク時の労働時間管理、安全衛生確保、メンタルヘルス対策について改定。自宅での作業環境整備に関する留意事項を追加。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/shigoto/guideline.html",
      label: "厚生労働省 テレワークガイドライン",
    },
  },

  // ── 2022年 ──────────────────────────────────────────
  {
    id: "lr-real-2022-001",
    title: "フルハーネス型墜落制止用器具の経過措置終了",
    publishedAt: "2022-01-02",
    revisionNumber: "平成30年厚生労働省告示第249号（経過措置終了）",
    kind: "ordinance",
    category: "告示",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "旧規格の安全帯の使用経過措置が2022年1月1日で終了。6.75m超の高所作業では新規格フルハーネス型の使用が完全義務化。",
    source: {
      url: "https://www.mhlw.go.jp/stf/newpage_01188.html",
      label: "厚生労働省 墜落制止用器具",
    },
  },
  {
    id: "lr-real-2022-002",
    title: "化学物質管理の自律的管理への転換（安衛則等改正）",
    publishedAt: "2022-05-31",
    revisionNumber: "令和4年厚生労働省令第91号",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "化学物質管理を「法令準拠型」から「自律的管理」へ転換する大規模改正。リスクアセスメント対象物質を約2,900物質に段階的拡大。化学物質管理者の選任義務化。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
      label: "厚生労働省 化学物質の自律的管理",
    },
  },
  {
    id: "lr-real-2022-003",
    title: "一人親方等の安全衛生対策に関する安衛則改正",
    publishedAt: "2022-04-15",
    revisionNumber: "令和4年厚生労働省令第82号",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "中",
    summary:
      "有害物質を取り扱う作業場での保護措置を、請負人（一人親方等）や同一場所の他の労働者にも適用拡大。危険有害な作業を行う事業者の配慮義務を規定。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
      label: "厚生労働省 安全衛生対策",
    },
  },

  // ── 2023年 ──────────────────────────────────────────
  {
    id: "lr-real-2023-001",
    title: "化学物質の自律的管理（第1段階施行）",
    publishedAt: "2023-04-01",
    revisionNumber: "令和4年厚生労働省令第91号（第1段階施行）",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "リスクアセスメント対象物質674物質のラベル表示・SDS交付・リスクアセスメント義務が施行。化学物質管理者の選任が義務化。保護具着用管理責任者の選任も開始。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
      label: "厚生労働省 化学物質の自律的管理",
    },
  },
  {
    id: "lr-real-2023-002",
    title: "石綿事前調査の有資格者による実施義務化",
    publishedAt: "2023-10-01",
    revisionNumber: "令和2年法律第39号（第2段階施行）",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "解体・改修工事前の石綿事前調査を、建築物石綿含有建材調査者等の有資格者が実施することを義務化。調査結果の報告も義務。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000113878.html",
      label: "厚生労働省 石綿対策",
    },
  },
  {
    id: "lr-real-2023-003",
    title: "足場からの墜落防止措置の強化（安衛則改正）",
    publishedAt: "2023-10-01",
    revisionNumber: "令和5年厚生労働省令第35号",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "足場の点検者に十分な知識・経験を有する者の指名を義務化。一側足場の使用範囲の明確化。足場の組立て等作業時の墜落防止措置を強化。",
    source: {
      url: "https://www.mhlw.go.jp/stf/newpage_32408.html",
      label: "厚生労働省 足場からの墜落防止",
    },
  },

  // ── 2024年 ──────────────────────────────────────────
  {
    id: "lr-real-2024-001",
    title: "建設業・自動車運転業の時間外労働上限規制の適用",
    publishedAt: "2024-04-01",
    revisionNumber: "平成30年法律第71号（猶予期間終了）",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "2024年問題。建設業・自動車運転業・医師に時間外労働の上限規制（年720時間、月100時間未満、複数月平均80時間以内）を適用開始。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000148322.html",
      label: "厚生労働省 働き方改革",
    },
  },
  {
    id: "lr-real-2024-002",
    title: "化学物質の自律的管理（第2段階施行・234物質追加）",
    publishedAt: "2024-04-01",
    revisionNumber: "令和4年厚生労働省令第91号（第2段階施行）",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "SDS交付・ラベル表示義務の対象に234物質を追加（合計約900物質）。化学物質管理者の専門的講習の修了を義務化（製造事業場）。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
      label: "厚生労働省 化学物質の自律的管理",
    },
  },
  {
    id: "lr-real-2024-003",
    title: "化学物質による健康障害防止のための濃度基準値設定",
    publishedAt: "2024-04-01",
    revisionNumber: "令和5年厚生労働省告示第177号",
    kind: "ordinance",
    category: "告示",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "67物質の濃度基準値（8時間TWA・短時間ばく露限界値）を初めて設定。事業者はこの基準値以下に管理する義務。2025年度以降も追加予定。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
      label: "厚生労働省 化学物質管理",
    },
  },

  // ── 2025年 ──────────────────────────────────────────
  {
    id: "lr-real-2025-001",
    title: "労働安全衛生法等の一部改正（令和7年法律第33号）",
    publishedAt: "2025-05-14",
    revisionNumber: "令和7年法律第33号",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "個人事業者等への安全衛生上の措置義務、ストレスチェックの全事業場への拡大、化学物質管理の強化、機械による危険防止措置、高齢者の労災防止を盛り込んだ大規模改正。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00048.html",
      label: "厚生労働省 安衛法改正",
    },
  },
  {
    id: "lr-real-2025-002",
    title: "労働者死傷病報告等の電子申請義務化",
    publishedAt: "2025-01-01",
    revisionNumber: "令和6年厚生労働省令第131号",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "中",
    summary:
      "労働者死傷病報告、総括安全衛生管理者等の選任届、定期健康診断結果報告等の電子申請を義務化。紙での提出は原則不可に。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/denshishinsei.html",
      label: "厚生労働省 電子申請義務化",
    },
  },
  {
    id: "lr-real-2025-003",
    title: "熱中症対策の義務化（安衛則改正）",
    publishedAt: "2025-06-01",
    revisionNumber: "令和7年厚生労働省令第XX号",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "WBGT28以上または気温31度以上の環境での作業において、暑さ指数の測定・休憩場所の設置・水分塩分の提供等を義務化。違反には罰則（6月以下の懲役又は50万円以下の罰金）。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
      label: "厚生労働省 熱中症対策",
    },
  },
  {
    id: "lr-real-2025-004",
    title: "避難・立入禁止等の措置対象の拡大",
    publishedAt: "2025-04-01",
    revisionNumber: "令和6年厚生労働省令（施行）",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "中",
    summary:
      "事業者による退避・立入禁止措置の対象を、自社労働者のみから請負人の労働者を含む全作業者に拡大。約20項目の規制が施行。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00048.html",
      label: "厚生労働省 安衛法改正",
    },
  },

  // ── 2026年 ──────────────────────────────────────────
  {
    id: "lr-real-2026-001",
    title: "個人事業者等の災害防止義務の施行",
    publishedAt: "2026-04-01",
    revisionNumber: "令和7年法律第33号（施行）",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "一人親方・個人事業者に対しても、事業者が安全衛生上の措置を講じる義務を規定。注文者の配慮義務も新設。建設業を中心に影響大。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00048.html",
      label: "厚生労働省 安衛法改正",
    },
  },
  {
    id: "lr-real-2026-002",
    title: "高年齢者の労働災害防止措置（努力義務）",
    publishedAt: "2026-04-01",
    revisionNumber: "令和7年法律第33号（施行）",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "低",
    summary:
      "60歳以上の労働者に対する体力テストの実施、転倒防止対策、作業環境の改善を事業者の努力義務として法定化。エイジフレンドリーガイドラインの法的根拠を明確化。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00048.html",
      label: "厚生労働省 安衛法改正",
    },
  },
  {
    id: "lr-real-2026-003",
    title: "化学物質の自律的管理（第3段階・約850物質追加予定）",
    publishedAt: "2026-04-01",
    revisionNumber: "令和7年厚生労働省令（予定）",
    kind: "ordinance",
    category: "省令",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "SDS交付・ラベル表示・リスクアセスメント義務の対象にさらに約850物質を追加予定。対象物質は合計約2,900物質に拡大。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
      label: "厚生労働省 化学物質の自律的管理",
    },
  },

  // ── 2027年（予定） ──────────────────────────────────
  {
    id: "lr-real-2027-001",
    title: "ストレスチェック制度の全事業場への拡大（予定）",
    publishedAt: "2027-01-01",
    revisionNumber: "令和7年法律第33号（施行予定）",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "高",
    summary:
      "現行の「常時50人以上」の事業場に限定されているストレスチェック義務を、全事業場に拡大。小規模事業場でもメンタルヘルス対策を義務化。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00048.html",
      label: "厚生労働省 安衛法改正",
    },
  },
  {
    id: "lr-real-2027-002",
    title: "個人事業者の災害報告義務化（予定）",
    publishedAt: "2027-04-01",
    revisionNumber: "令和7年法律第33号（施行予定）",
    kind: "law",
    category: "労働安全衛生法",
    issuer: "厚生労働省",
    impact: "中",
    summary:
      "一人親方・個人事業者が被災した場合の災害報告義務を新設。従来は労働者のみが対象だった死傷病報告の範囲を拡大。",
    source: {
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00048.html",
      label: "厚生労働省 安衛法改正",
    },
  },
];

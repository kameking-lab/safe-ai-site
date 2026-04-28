import type { UgcSubmission } from "@/lib/ugc-types";

/**
 * 現場の声（UGC）シードデータ。
 * 公開デモ用に、運営側が用意した「実体験ベース」の事例。
 * 将来 DB に移行する際はこのファイルを廃止する。
 */
export const COMMUNITY_CASES_SEED: UgcSubmission[] = [
  {
    id: "ugc-seed-001",
    createdAt: "2026-04-21T08:00:00.000Z",
    category: "hiyari",
    industry: "construction",
    title: "鉄骨建方で安全帯フックの掛け替え時に肝を冷やした",
    body: "鉄骨建方の作業中、安全帯のフックを掛け替えるタイミングで一瞬両手フリーになり、足場が揺れた瞬間バランスを崩しそうになりました。ダブルランヤード（2丁掛け）に切り替えてからは「無胴綱状態」がゼロになり、現場全体の不安感も減りました。古い安全帯が残っていないか定期点検することをおすすめします。",
    bodyOriginal:
      "鉄骨建方の作業中、安全帯のフックを掛け替えるタイミングで一瞬両手フリーになり、足場が揺れた瞬間バランスを崩しそうになりました。ダブルランヤード（2丁掛け）に切り替えてからは「無胴綱状態」がゼロになり、現場全体の不安感も減りました。古い安全帯が残っていないか定期点検することをおすすめします。",
    authorAlias: "匿名のコアラ#3421",
    status: "approved",
    audit: {
      ngWords: [],
      spamScore: 0,
      piiDetected: [],
      recommendScore: 92,
      recommendation: "auto_approve",
      reasons: ["十分な記述量", "安全関連の具体的な記述"],
    },
    supervisorComment:
      "墜落制止用器具は2022年1月から原則フルハーネス型が義務化されています。2丁掛け運用は厚労省も推奨。",
    relatedNotices: ["安衛則第518条（作業床）", "安衛則第521条（安全帯等）"],
  },
  {
    id: "ugc-seed-002",
    createdAt: "2026-04-15T05:30:00.000Z",
    category: "tips",
    industry: "manufacturing",
    title: "化学物質RAでヒヤリ事案を「定量評価」に乗せたら現場が動いた",
    body: "従来は『臭いがキツい』『目がしみる』といった感覚的な訴えで終わっていた化学物質関連のヒヤリですが、CREATE-SIMPLE での定量評価を入れたら、ばく露推定量がリスクI～IVのどこに入るかが見えるようになり、局排の能力アップ稟議が一発で通りました。リスクの『言語化』が動くお金を変えると実感。",
    bodyOriginal:
      "従来は『臭いがキツい』『目がしみる』といった感覚的な訴えで終わっていた化学物質関連のヒヤリですが、CREATE-SIMPLE での定量評価を入れたら、ばく露推定量がリスクI～IVのどこに入るかが見えるようになり、局排の能力アップ稟議が一発で通りました。リスクの『言語化』が動くお金を変えると実感。",
    authorAlias: "匿名のフクロウ#7882",
    status: "approved",
    audit: {
      ngWords: [],
      spamScore: 0,
      piiDetected: [],
      recommendScore: 88,
      recommendation: "auto_approve",
      reasons: ["十分な記述量", "安全関連の具体的な記述"],
    },
    supervisorComment:
      "2024年4月の化学物質規制見直しで、リスクアセスメント対象物質が大幅拡大されました。CREATE-SIMPLEは厚労省公開の入門ツールとして有効です。",
    relatedNotices: ["安衛法第57条の3", "化学物質管理者選任義務（2024年4月施行）"],
  },
  {
    id: "ugc-seed-003",
    createdAt: "2026-04-10T02:15:00.000Z",
    category: "question",
    industry: "care",
    title: "介護現場の腰痛対策、機械化どこまで導入すべき？",
    body: "特養で勤務しています。移乗介助での腰痛が職員の最大の離職要因になっています。スライディングボード／リフトの導入を検討しているのですが、現場が「使い方を覚える方が大変」と言って広がりません。導入が成功した施設の運用ルールを聞きたいです。",
    bodyOriginal:
      "特養で勤務しています。移乗介助での腰痛が職員の最大の離職要因になっています。スライディングボード／リフトの導入を検討しているのですが、現場が「使い方を覚える方が大変」と言って広がりません。導入が成功した施設の運用ルールを聞きたいです。",
    authorAlias: "匿名のシマエナガ#5530",
    status: "approved",
    audit: {
      ngWords: [],
      spamScore: 0,
      piiDetected: [],
      recommendScore: 80,
      recommendation: "auto_approve",
      reasons: ["十分な記述量", "安全関連の具体的な記述"],
    },
    supervisorComment:
      "厚労省『職場における腰痛予防対策指針』では、人力による抱え上げ移乗を原則しないことが推奨されています。リフト導入時は『使うのが標準・使わないのが例外』に運用を逆転させるのが定着のコツです。",
    relatedNotices: ["腰痛予防対策指針（平成25年6月18日改訂）"],
  },
  {
    id: "ugc-seed-004",
    createdAt: "2026-04-05T07:45:00.000Z",
    category: "hiyari",
    industry: "logistics",
    title: "フォークリフト走路と歩行者動線が交差した瞬間",
    body: "倉庫内でピッキング作業者がリフト走路を横断したところ、ちょうど死角から出てきたリフトと接触しかけました。床のラインだけでは気付かない人がいると分かったので、交差ポイントに音と光のセンサ式注意灯を設置。今のところ再発はありません。",
    bodyOriginal:
      "倉庫内でピッキング作業者がリフト走路を横断したところ、ちょうど死角から出てきたリフトと接触しかけました。床のラインだけでは気付かない人がいると分かったので、交差ポイントに音と光のセンサ式注意灯を設置。今のところ再発はありません。",
    authorAlias: "匿名のペンギン#1180",
    status: "approved",
    audit: {
      ngWords: [],
      spamScore: 0,
      piiDetected: [],
      recommendScore: 86,
      recommendation: "auto_approve",
      reasons: ["十分な記述量", "安全関連の具体的な記述"],
    },
    supervisorComment:
      "歩行者と車両の分離が原則。物理的な分離が難しい場合は『時間分離（ピッキング時はリフト停止）』も有効です。",
    relatedNotices: ["安衛則第151条の7（接触の防止）"],
  },
];

/**
 * CAS番号 ⇄ 安衛法施行令 別表号 照合インデックス（F2 突合パイプライン）
 *
 * サイトが特別則タグ（特化則1〜3類・有機則1〜3種・特別管理物質）を表示する全CASについて、
 * 「そのCASが令別表のどの号に該当するか（または非該当か）」を人手レビューで固定する。
 *
 * 【設計原則 — 診断 docs/fable-diagnosis-2026-07-02/03 4-1】
 * - このファイルは**名前解決のみ**を担い、区分（第何類か・特管か）は一切持たない。
 *   区分は必ず anei-beppyo-snapshot.ts（e-Gov生成物）から導出する。
 *   → 号の割り当てを誤ると nameContains の自己検査（substance-legal-audit）が落ちる。
 * - エントリの存在自体が「e-Gov現行条文と突合済み」の宣言。beppyo3/beppyo62 が無い
 *   エントリは「令別表第3・第6の2に**非該当であることを確認済み**」を意味する
 *   （タグ無し=未調査と区別するため、notes に非該当の根拠を必ず書く）。
 * - 群指定（「〜及びその化合物」等）は代表CASを群の号へ紐付け、scopeNote に範囲を明記する
 *   （CAS展開の創作は禁止。extra-regulations.ts と同方針）。
 * - 新しいCASに特別則タグを付ける場合、ここにエントリを追加しない限り
 *   substance-legal-audit.test.ts が「index-missing」で落ちる（＝手書きマッピングの侵入防止）。
 *
 * レビュー: 2026-07-03 e-Gov現行条文（anei-beppyo-snapshot.ts の revisionId 参照）と突合。
 */

/** 令別表第3 への参照。kubun は自己検査用の宣言（snapshotと不一致なら監査が落ちる） */
export type Beppyo3Ref = {
  kubun: 1 | 2 | 3;
  go: string;
  /** 自己検査: snapshot 側の同号の name にこの文字列が含まれること */
  nameContains: string;
};

/** 令別表第6の2 への参照 */
export type Beppyo62Ref = {
  go: number;
  nameContains: string;
};

export type CasLawIndexEntry = {
  /** CAS番号（mock DB の混合物表記「—（混合物）」もキーとして許容） */
  cas: string;
  label: string;
  /** 令別表第3（特化則）の該当号。無指定＝非該当を確認済み */
  beppyo3?: readonly Beppyo3Ref[];
  /** 令別表第6の2（有機則）の該当号。無指定＝非該当を確認済み */
  beppyo62?: readonly Beppyo62Ref[];
  /** 群指定の適用範囲（該当する場合は必ず書く） */
  scopeNote?: string;
  /** 非該当の根拠・別規則の適用等 */
  notes?: string;
};

export const CAS_LAW_INDEX: readonly CasLawIndexEntry[] = [
  // ---- 特化則 第一類 --------------------------------------------------
  {
    cas: "1336-36-3",
    label: "ポリ塩化ビフェニル（PCB）",
    beppyo3: [{ kubun: 1, go: "3", nameContains: "塩素化ビフエニル" }],
    notes: "特別管理物質からは明示除外（特化則38条の4「塩素化ビフェニル等を除く」）",
  },
  {
    cas: "7440-41-7",
    label: "ベリリウム及びその化合物",
    beppyo3: [{ kubun: 1, go: "6", nameContains: "ベリリウム" }],
    scopeNote: "ベリリウム及びその化合物（群指定・代表CASは金属ベリリウム）",
  },
  // ---- 特化則 第二類 --------------------------------------------------
  {
    cas: "79-06-1",
    label: "アクリルアミド",
    beppyo3: [{ kubun: 2, go: "1", nameContains: "アクリルアミド" }],
  },
  {
    cas: "7440-74-6",
    label: "インジウム化合物",
    beppyo3: [{ kubun: 2, go: "3の2", nameContains: "インジウム化合物" }],
    scopeNote: "対象はインジウム化合物（金属インジウム単体は令別表第3の対象外）",
  },
  {
    cas: "100-41-4",
    label: "エチルベンゼン",
    beppyo3: [{ kubun: 2, go: "3の3", nameContains: "エチルベンゼン" }],
  },
  {
    cas: "75-21-8",
    label: "エチレンオキシド",
    beppyo3: [{ kubun: 2, go: "5", nameContains: "エチレンオキシド" }],
    notes: "令22条1項3号の括弧書きにより特化則健診（39条）の対象外",
  },
  {
    cas: "75-01-4",
    label: "塩化ビニル",
    beppyo3: [{ kubun: 2, go: "6", nameContains: "塩化ビニル" }],
  },
  {
    cas: "7782-50-5",
    label: "塩素",
    beppyo3: [{ kubun: 2, go: "7", nameContains: "塩素" }],
  },
  {
    cas: "7440-43-9",
    label: "カドミウム及びその化合物",
    beppyo3: [{ kubun: 2, go: "10", nameContains: "カドミウム" }],
    scopeNote: "カドミウム及びその化合物（群指定）",
  },
  {
    cas: "18540-29-9",
    label: "六価クロム化合物（クロム酸塩・重クロム酸塩）",
    beppyo3: [
      { kubun: 2, go: "11", nameContains: "クロム酸及びその塩" },
      { kubun: 2, go: "21", nameContains: "重クロム酸及びその塩" },
    ],
    scopeNote: "クロム酸及びその塩／重クロム酸及びその塩（群指定・代表CASは六価クロムイオン）",
  },
  {
    cas: "67-66-3",
    label: "クロロホルム",
    beppyo3: [{ kubun: 2, go: "11の2", nameContains: "クロロホルム" }],
    notes: "平成26年改正で有機則第一種から特化則第二類（特別有機溶剤）へ移行",
  },
  {
    cas: "7440-48-4",
    label: "コバルト及びその無機化合物",
    beppyo3: [{ kubun: 2, go: "13の2", nameContains: "コバルト" }],
    scopeNote: "コバルト及びその無機化合物（群指定）",
  },
  {
    cas: "8007-45-2",
    label: "コールタール",
    beppyo3: [{ kubun: 2, go: "14", nameContains: "コールタール" }],
  },
  {
    cas: "75-56-9",
    label: "酸化プロピレン",
    beppyo3: [{ kubun: 2, go: "15", nameContains: "酸化プロピレン" }],
  },
  {
    cas: "74-90-8",
    label: "シアン化水素",
    beppyo3: [{ kubun: 2, go: "17", nameContains: "シアン化水素" }],
  },
  {
    cas: "56-23-5",
    label: "四塩化炭素",
    beppyo3: [{ kubun: 2, go: "18の2", nameContains: "四塩化炭素" }],
    notes: "平成26年改正で有機則第一種から特化則第二類（特別有機溶剤）へ移行",
  },
  {
    cas: "78-87-5",
    label: "1,2-ジクロロプロパン",
    beppyo3: [{ kubun: 2, go: "19の2", nameContains: "ジクロロプロパン" }],
  },
  {
    cas: "75-09-2",
    label: "ジクロロメタン",
    beppyo3: [{ kubun: 2, go: "19の3", nameContains: "ジクロロメタン" }],
  },
  {
    cas: "7439-97-6",
    label: "水銀及びその無機化合物",
    beppyo3: [{ kubun: 2, go: "22", nameContains: "水銀及びその無機化合物" }],
    scopeNote: "水銀及びその無機化合物（硫化水銀を除く。群指定）",
  },
  {
    cas: "100-42-5",
    label: "スチレン",
    beppyo3: [{ kubun: 2, go: "22の2", nameContains: "スチレン" }],
  },
  {
    cas: "127-18-4",
    label: "テトラクロロエチレン",
    beppyo3: [{ kubun: 2, go: "22の4", nameContains: "テトラクロロエチレン" }],
  },
  {
    cas: "79-01-6",
    label: "トリクロロエチレン",
    beppyo3: [{ kubun: 2, go: "22の5", nameContains: "トリクロロエチレン" }],
  },
  {
    cas: "91-20-3",
    label: "ナフタレン",
    beppyo3: [{ kubun: 2, go: "23の2", nameContains: "ナフタレン" }],
  },
  {
    cas: "7440-02-0",
    label: "ニッケル（金属・化合物）",
    beppyo3: [{ kubun: 2, go: "23の3", nameContains: "ニツケル化合物" }],
    scopeNote:
      "対象はニッケル化合物（ニッケルカルボニルを除き、粉状の物に限る）。金属ニッケル単体は令別表第3の対象外",
  },
  {
    cas: "7440-38-2",
    label: "ヒ素及びその化合物",
    beppyo3: [{ kubun: 2, go: "27の2", nameContains: "砒素及びその化合物" }],
    scopeNote: "砒素及びその化合物（アルシン及び砒化ガリウムを除く。群指定）",
  },
  {
    cas: "7664-39-3",
    label: "フッ化水素",
    beppyo3: [{ kubun: 2, go: "28", nameContains: "弗化水素" }],
  },
  {
    cas: "71-43-2",
    label: "ベンゼン",
    beppyo3: [{ kubun: 2, go: "30", nameContains: "ベンゼン" }],
  },
  {
    cas: "50-00-0",
    label: "ホルムアルデヒド",
    beppyo3: [{ kubun: 2, go: "31の2", nameContains: "ホルムアルデヒド" }],
    notes: "令22条1項3号の括弧書きにより特化則健診（39条）の対象外",
  },
  {
    cas: "7439-96-5",
    label: "マンガン及びその化合物",
    beppyo3: [{ kubun: 2, go: "33", nameContains: "マンガン" }],
    scopeNote: "マンガン及びその化合物（群指定）",
  },
  {
    cas: "—（混合物）",
    label: "溶接ヒューム",
    beppyo3: [{ kubun: 2, go: "34の2", nameContains: "溶接ヒューム" }],
  },
  {
    cas: "142844-00-6",
    label: "リフラクトリーセラミックファイバー",
    beppyo3: [{ kubun: 2, go: "34の3", nameContains: "リフラクトリーセラミックファイバー" }],
  },
  {
    cas: "7783-06-4",
    label: "硫化水素",
    beppyo3: [{ kubun: 2, go: "35", nameContains: "硫化水素" }],
  },
  // ---- 特化則 第三類 --------------------------------------------------
  {
    cas: "7664-41-7",
    label: "アンモニア",
    beppyo3: [{ kubun: 3, go: "1", nameContains: "アンモニア" }],
  },
  {
    cas: "630-08-0",
    label: "一酸化炭素",
    beppyo3: [{ kubun: 3, go: "2", nameContains: "一酸化炭素" }],
  },
  {
    cas: "7647-01-0",
    label: "塩化水素",
    beppyo3: [{ kubun: 3, go: "3", nameContains: "塩化水素" }],
  },
  {
    cas: "7697-37-2",
    label: "硝酸",
    beppyo3: [{ kubun: 3, go: "4", nameContains: "硝酸" }],
  },
  {
    cas: "108-95-2",
    label: "フェノール",
    beppyo3: [{ kubun: 3, go: "6", nameContains: "フエノール" }],
  },
  {
    cas: "7664-93-9",
    label: "硫酸",
    beppyo3: [{ kubun: 3, go: "8", nameContains: "硫酸" }],
  },
  // ---- 有機則（令別表第6の2） ------------------------------------------
  {
    cas: "67-64-1",
    label: "アセトン",
    beppyo62: [{ go: 1, nameContains: "アセトン" }],
  },
  {
    cas: "67-63-0",
    label: "イソプロピルアルコール",
    beppyo62: [{ go: 3, nameContains: "イソプロピルアルコール" }],
  },
  {
    cas: "1330-20-7",
    label: "キシレン",
    beppyo62: [{ go: 11, nameContains: "キシレン" }],
  },
  {
    cas: "141-78-6",
    label: "酢酸エチル",
    beppyo62: [{ go: 18, nameContains: "酢酸エチル" }],
  },
  {
    cas: "68-12-2",
    label: "N,N-ジメチルホルムアミド",
    beppyo62: [{ go: 30, nameContains: "ジメチルホルムアミド" }],
  },
  {
    cas: "71-55-6",
    label: "1,1,1-トリクロロエタン",
    beppyo62: [{ go: 35, nameContains: "トリクロルエタン" }],
  },
  {
    cas: "108-88-3",
    label: "トルエン",
    beppyo62: [{ go: 37, nameContains: "トルエン" }],
  },
  {
    cas: "75-15-0",
    label: "二硫化炭素",
    beppyo62: [{ go: 38, nameContains: "二硫化炭素" }],
  },
  {
    cas: "110-54-3",
    label: "n-ヘキサン",
    beppyo62: [{ go: 39, nameContains: "ノルマルヘキサン" }],
  },
  {
    cas: "67-56-1",
    label: "メタノール",
    beppyo62: [{ go: 42, nameContains: "メタノール" }],
  },
  {
    cas: "78-93-3",
    label: "メチルエチルケトン",
    beppyo62: [{ go: 44, nameContains: "メチルエチルケトン" }],
  },
  {
    cas: "8006-61-9",
    label: "ガソリン",
    beppyo62: [{ go: 48, nameContains: "ガソリン" }],
  },
  // ---- 令別表第3・第6の2 に非該当と確認済みの物質 ----------------------
  {
    cas: "1332-21-4",
    label: "石綿",
    notes:
      "令別表第3に非収載。製造等禁止（安衛法55条・令16条）＋石綿則が適用（sekimenタグは監査対象外）",
  },
  {
    cas: "12172-73-5",
    label: "アモサイト",
    notes: "石綿の一種。令別表第3に非収載（石綿則の適用）",
  },
  {
    cas: "12001-29-5",
    label: "クリソタイル",
    notes: "石綿の一種。令別表第3に非収載（石綿則の適用）",
  },
  {
    cas: "12001-28-4",
    label: "クロシドライト",
    notes: "石綿の一種。令別表第3に非収載（石綿則の適用）",
  },
  {
    cas: "106-99-0",
    label: "1,3-ブタジエン",
    notes:
      "令別表第3に非収載＝第二類物質ではない。特化則38条の17（1,3-ブタジエン等に係る特例措置）の対象という別建ての規制",
  },
  {
    cas: "101-68-8",
    label: "メチレンビス(4,1-フェニレン)ジイソシアネート（MDI）",
    notes: "令別表第3に非収載（特化則対象はTDI＝第2号23。MDIは別物質）。RA対象物ではある",
  },
  {
    cas: "7439-92-1",
    label: "鉛",
    notes:
      "令別表第3・第6の2に非収載。鉛則の対象（令別表第4の鉛業務＝業務列挙のため本スナップショットの機械突合対象外。namariタグは人手検証）",
  },
  {
    cas: "78-00-2",
    label: "四アルキル鉛",
    notes:
      "令別表第3・第6の2に非収載。四アルキル鉛則の対象（令別表第5＝業務列挙のため機械突合対象外。yonalkylタグは人手検証）",
  },
  {
    cas: "64-17-5",
    label: "エタノール",
    notes: "令別表第6の2に非収載＝有機則対象外。令別表第3にも非収載",
  },
  {
    cas: "7727-37-9",
    label: "窒素",
    notes: "特化則・有機則の対象外。酸欠則は場所（酸素濃度）規制のため物質列挙なし",
  },
  {
    cas: "124-38-9",
    label: "二酸化炭素",
    notes: "特化則・有機則の対象外。酸欠則は場所規制のため物質列挙なし",
  },
  {
    cas: "14808-60-7",
    label: "結晶質シリカ（石英）",
    notes: "特化則・有機則の対象外。粉じん則は粉じん作業（作業列挙）規制",
  },
  {
    cas: "14464-46-1",
    label: "結晶質シリカ（クリストバライト）",
    notes: "特化則・有機則の対象外。粉じん則は粉じん作業規制",
  },
  {
    cas: "10043-35-3",
    label: "ホウ酸",
    notes: "令別表第3・第6の2に非収載（リスクアセスメント対象物ではある）",
  },
];

export const CAS_LAW_INDEX_BY_CAS: ReadonlyMap<string, CasLawIndexEntry> = new Map(
  CAS_LAW_INDEX.map((e) => [e.cas, e]),
);

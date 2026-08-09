import type { LawArticle } from "./law-types";

/**
 * 電気作業に関する、回答生成専用の政府公式一次資料の最小抜粋。
 *
 * - e-Gov 法令 API v2 は `asof=2026-08-09` で取得した現行リビジョンを固定。
 * - 厚労省告示と経産省 Q&A は同日、各省の公式公開ページで現行公開を確認。
 * - `sourceHash` は、このファイルに収載した逐語本文（`text`）の UTF-8 SHA-256。
 * - 要約ではなく公式本文の抜粋であり、人手で法令名・条番号・文言を照合済み。
 */
export const verifiedPrimaryElectricalArticles = [
  {
    law: "電気事業法",
    lawShort: "電事法",
    articleNum: "第42条",
    articleTitle: "保安規程",
    text:
      "事業用電気工作物（小規模事業用電気工作物を除く。以下この款において同じ。）を設置する者は、事業用電気工作物の工事、維持及び運用に関する保安を確保するため、主務省令で定めるところにより、保安を一体的に確保することが必要な事業用電気工作物の組織ごとに保安規程を定め、当該組織における事業用電気工作物の使用（第五十一条第一項又は第五十二条第一項の自主検査を伴うものにあつては、その工事）の開始前に、主務大臣に届け出なければならない。２　事業用電気工作物を設置する者は、保安規程を変更したときは、遅滞なく、変更した事項を主務大臣に届け出なければならない。３　主務大臣は、事業用電気工作物の工事、維持及び運用に関する保安を確保するため必要があると認めるときは、事業用電気工作物を設置する者に対し、保安規程を変更すべきことを命ずることができる。４　事業用電気工作物を設置する者及びその従業者は、保安規程を守らなければならない。",
    keywords: [
      "電気設備",
      "事業用電気工作物",
      "保安規程",
      "点検",
      "設備管理",
    ],
    sourceKind: "government-official-primary",
    sourceUrl:
      "https://laws.e-gov.go.jp/law/339AC0000000170?occasion_date=20260809#Mp-At_42",
    sourceLawId: "339AC0000000170",
    sourceRevisionId: "339AC0000000170_20260803_508AC0000000068",
    amendmentPromulgatedOn: "2026-07-24",
    amendmentHistory: [
      {
        revisionId: "339AC0000000170_20260803_508AC0000000068",
        amendmentLawNumber: "令和八年法律第六十八号",
        promulgatedOn: "2026-07-24",
        effectiveOn: "2026-08-03",
        status: "enforced",
        sourceUrl:
          "https://laws.e-gov.go.jp/law/339AC0000000170?occasion_date=20260809#Mp-At_42",
      },
    ],
    sourceVersionKind: "current",
    sourceFetchedAt: "2026-08-09",
    sourceHash: "77331c896c031aed648133fc30c8b1adf76484769bb1925894007cedb9429eed",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "reviewed",
  },
  {
    law: "電気事業法",
    lawShort: "電事法",
    articleNum: "第43条",
    articleTitle: "主任技術者",
    text:
      "事業用電気工作物を設置する者は、事業用電気工作物の工事、維持及び運用に関する保安の監督をさせるため、主務省令で定めるところにより、主任技術者免状の交付を受けている者のうちから、主任技術者を選任しなければならない。２　自家用電気工作物（小規模事業用電気工作物を除く。）を設置する者は、前項の規定にかかわらず、主務大臣の許可を受けて、主任技術者免状の交付を受けていない者を主任技術者として選任することができる。３　事業用電気工作物を設置する者は、主任技術者を選任したとき（前項の許可を受けて選任した場合を除く。）は、遅滞なく、その旨を主務大臣に届け出なければならない。これを解任したときも、同様とする。４　主任技術者は、事業用電気工作物の工事、維持及び運用に関する保安の監督の職務を誠実に行わなければならない。５　事業用電気工作物の工事、維持又は運用に従事する者は、主任技術者がその保安のためにする指示に従わなければならない。",
    keywords: [
      "電気主任技術者",
      "主任技術者",
      "保安監督",
      "自家用電気工作物",
      "設備管理",
    ],
    sourceKind: "government-official-primary",
    sourceUrl:
      "https://laws.e-gov.go.jp/law/339AC0000000170?occasion_date=20260809#Mp-At_43",
    sourceLawId: "339AC0000000170",
    sourceRevisionId: "339AC0000000170_20260803_508AC0000000068",
    amendmentPromulgatedOn: "2026-07-24",
    amendmentHistory: [
      {
        revisionId: "339AC0000000170_20260803_508AC0000000068",
        amendmentLawNumber: "令和八年法律第六十八号",
        promulgatedOn: "2026-07-24",
        effectiveOn: "2026-08-03",
        status: "enforced",
        sourceUrl:
          "https://laws.e-gov.go.jp/law/339AC0000000170?occasion_date=20260809#Mp-At_43",
      },
    ],
    sourceVersionKind: "current",
    sourceFetchedAt: "2026-08-09",
    sourceHash: "4f7d12a560534068305a1fdbd5ff8cc8307d476dbd53e6e60ff2a2eb82dde955",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "reviewed",
  },
  {
    law: "安全衛生特別教育規程（昭和四十七年労働省告示第九十二号）",
    lawShort: "特別教育規程",
    articleNum: "第5条",
    articleTitle: "電気取扱業務に係る特別教育（高圧・特別高圧）",
    text:
      "安衛則第三十六条第四号に掲げる業務のうち、高圧若しくは特別高圧の充電電路又は当該充電電路の支持物の敷設、点検、修理又は操作の業務に係る特別教育は、学科教育及び実技教育により行なうものとする。２　前項の学科教育は、次の表の上欄に掲げる科目に応じ、それぞれ、同表の中欄に掲げる範囲について同表の下欄に掲げる時間以上行なうものとする。高圧又は特別高圧の電気に関する基礎知識　高圧又は特別高圧の電気の危険性　接近限界距離　短絡　漏電　接地　静電誘導　電気絶縁　一・五時間　高圧又は特別高圧の電気設備に関する基礎知識　発電設備　送電設備　配電設備　変電設備　受電設備　電気使用設備　保守及び点検　二時間　高圧又は特別高圧用の安全作業用具に関する基礎知識　絶縁用保護具(高圧に係る業務を行なう者に限る。)　絶縁用防具(高圧に係る業務を行なう者に限る。)　活線作業用器具　活線作業用装置　検電器　短絡接地器具　その他の安全作業用具　管理　一・五時間　高圧又は特別高圧の活線作業及び活線近接作業の方法　充電電路の防護　作業者の絶縁保護　活線作業用器具及び活線作業用装置の取扱い　安全距離の確保　停電電路に対する措置　開閉装置の操作　作業管理　救急処置　災害防止　五時間　関係法令　法、令及び安衛則中の関係条項　一時間　３　第一項の実技教育は、高圧又は特別高圧の活線作業及び活線近接作業の方法について、十五時間以上(充電電路の操作の業務のみを行なう者については、一時間以上)行なうものとする。",
    keywords: [
      "電気取扱業務",
      "特別教育",
      "高圧",
      "特別高圧",
      "充電電路",
      "点検",
      "活線近接作業",
      "開閉器操作",
    ],
    sourceKind: "government-official-primary",
    sourceUrl:
      "https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1",
    sourceVersionKind: "current",
    sourceFetchedAt: "2026-08-09",
    sourceHash: "f58a389f00358d5d9e29e0ecd0e6a1d684bbf33d47554b59d05a433e113d741a",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "reviewed",
  },
  {
    law: "安全衛生特別教育規程（昭和四十七年労働省告示第九十二号）",
    lawShort: "特別教育規程",
    articleNum: "第6条",
    articleTitle: "電気取扱業務に係る特別教育（低圧）",
    text:
      "安衛則第三十六条第四号に掲げる業務のうち、低圧の充電電路の敷設若しくは修理の業務又は配電盤室、変電室等区画された場所に設置する低圧の電路のうち充電部分が露出している開閉器の操作の業務に係る特別教育は、学科教育及び実技教育により行なうものとする。２　前項の学科教育は、次の表の上欄に掲げる科目に応じ、それぞれ、同表の中欄に掲げる範囲について同表の下欄に掲げる時間以上行なうものとする。低圧の電気に関する基礎知識　低圧の電気の危険性　短絡　漏電　接地　電気絶縁　一時間　低圧の電気設備に関する基礎知識　配電設備　変電設備　配線　電気使用設備　保守及び点検　二時間　低圧用の安全作業用具に関する基礎知識　絶縁用保護具　絶縁用防具　活線作業用器具　検電器　その他の安全作業用具　管理　一時間　低圧の活線作業及び活線近接作業の方法　充電電路の防護　作業者の絶縁保護　停電電路に対する措置　作業管理　救急処置　災害防止　二時間　関係法令　法、令及び安衛則中の関係条項　一時間　３　第一項の実技教育は、低圧の活線作業及び活線近接作業の方法について、七時間以上(開閉器の操作の業務のみを行なう者については、一時間以上)行なうものとする。",
    keywords: [
      "電気取扱業務",
      "特別教育",
      "低圧",
      "充電電路",
      "配電盤",
      "変電室",
      "開閉器操作",
      "活線近接作業",
    ],
    sourceKind: "government-official-primary",
    sourceUrl:
      "https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1",
    sourceVersionKind: "current",
    sourceFetchedAt: "2026-08-09",
    sourceHash: "2bc3aa8572e402dedcae0791ac75751902af2abab96d3ac2fa9e91f27f7d2db4",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "reviewed",
  },
  {
    law: "電気工事士法施行令",
    lawShort: "電工士法令",
    articleNum: "第1条",
    articleTitle: "軽微な工事",
    text:
      "電気工事士法（以下「法」という。）第二条第三項ただし書の政令で定める軽微な工事は、次のとおりとする。一　電圧六百ボルト以下で使用する差込み接続器、ねじ込み接続器、ソケット、ローゼットその他の接続器又は電圧六百ボルト以下で使用するナイフスイッチ、カットアウトスイッチ、スナップスイッチその他の開閉器にコード又はキャブタイヤケーブルを接続する工事　二　電圧六百ボルト以下で使用する電気機器（配線器具を除く。以下同じ。）又は電圧六百ボルト以下で使用する蓄電池の端子に電線（コード、キャブタイヤケーブル及びケーブルを含む。以下同じ。）をねじ止めする工事　三　電圧六百ボルト以下で使用する電力量計若しくは電流制限器又はヒューズを取り付け、又は取り外す工事　四　電鈴、インターホーン、火災感知器、豆電球その他これらに類する施設に使用する小型変圧器（二次電圧が三十六ボルト以下のものに限る。）の二次側の配線工事　五　電線を支持する柱、腕木その他これらに類する工作物を設置し、又は変更する工事　六　地中電線用の暗渠又は管を設置し、又は変更する工事",
    keywords: [
      "電気工事士",
      "軽微な工事",
      "接続器",
      "開閉器",
      "電線接続",
      "六百ボルト",
    ],
    sourceKind: "government-official-primary",
    sourceUrl:
      "https://laws.e-gov.go.jp/law/335CO0000000260?occasion_date=20260809#Mp-At_1",
    sourceLawId: "335CO0000000260",
    sourceRevisionId: "335CO0000000260_20251114_507CO0000000374",
    amendmentPromulgatedOn: "2025-11-14",
    amendmentHistory: [
      {
        revisionId: "335CO0000000260_20251114_507CO0000000374",
        amendmentLawNumber: "令和七年政令第三百七十四号",
        promulgatedOn: "2025-11-14",
        effectiveOn: "2025-11-14",
        status: "enforced",
        sourceUrl:
          "https://laws.e-gov.go.jp/law/335CO0000000260?occasion_date=20260809#Mp-At_1",
      },
    ],
    sourceVersionKind: "current",
    sourceFetchedAt: "2026-08-09",
    sourceHash: "2cca9aa41b48bd538dabfc4fa4d04b6e64e1d3caa7d3d986b917f460d2295ba5",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "reviewed",
  },
  {
    law: "電気工事士法施行規則",
    lawShort: "電工士法則",
    articleNum: "第2条",
    articleTitle: "軽微な作業",
    text:
      "法第三条第一項の自家用電気工作物の保安上支障がないと認められる作業であつて、経済産業省令で定めるものは、次のとおりとする。一　次に掲げる作業以外の作業　イ　電線相互を接続する作業（電気さく（定格一次電圧三百ボルト以下であつて感電により人体に危害を及ぼすおそれがないように出力電流を制限することができる電気さく用電源装置から電気を供給されるものに限る。以下同じ。）の電線を接続するものを除く。）　ロ　がいしに電線（電気さくの電線及びそれに接続する電線を除く。ハ、ニ及びチにおいて同じ。）を取り付け、又はこれを取り外す作業　ハ　電線を直接造営材その他の物件（がいしを除く。）に取り付け、又はこれを取り外す作業　ニ　電線管、線樋、ダクトその他これらに類する物に電線を収める作業　ホ　配線器具を造営材その他の物件に取り付け、若しくはこれを取り外し、又はこれに電線を接続する作業（露出型点滅器又は露出型コンセントを取り換える作業を除く。）　ヘ　電線管を曲げ、若しくはねじ切りし、又は電線管相互若しくは電線管とボックスその他の附属品とを接続する作業　ト　金属製のボックスを造営材その他の物件に取り付け、又はこれを取り外す作業　チ　電線、電線管、線樋、ダクトその他これらに類する物が造営材を貫通する部分に金属製の防護装置を取り付け、又はこれを取り外す作業　リ　金属製の電線管、線樋、ダクトその他これらに類する物又はこれらの附属品を、建造物のメタルラス張り、ワイヤラス張り又は金属板張りの部分に取り付け、又はこれらを取り外す作業　ヌ　配電盤を造営材に取り付け、又はこれを取り外す作業　ル　接地線（電気さくを使用するためのものを除く。以下この条において同じ。）を自家用電気工作物（自家用電気工作物のうち最大電力五百キロワット未満の需要設備において設置される電気機器であつて電圧六百ボルト以下で使用するものを除く。）に取り付け、若しくはこれを取り外し、接地線相互若しくは接地線と接地極（電気さくを使用するためのものを除く。以下この条において同じ。）とを接続し、又は接地極を地面に埋設する作業　ヲ　電圧六百ボルトを超えて使用する電気機器に電線を接続する作業　二　第一種電気工事士が従事する前号イからヲまでに掲げる作業を補助する作業　２　法第三条第二項の一般用電気工作物等の保安上支障がないと認められる作業であつて、経済産業省令で定めるものは、次のとおりとする。一　次に掲げる作業以外の作業　イ　前項第一号イからヌまで及びヲに掲げる作業　ロ　接地線を一般用電気工作物等（電圧六百ボルト以下で使用する電気機器を除く。）に取り付け、若しくはこれを取り外し、接地線相互若しくは接地線と接地極とを接続し、又は接地極を地面に埋設する作業　二　電気工事士が従事する前号イ及びロに掲げる作業を補助する作業",
    keywords: [
      "電気工事士",
      "軽微な作業",
      "電線相互接続",
      "配線器具",
      "配電盤",
      "接地線",
      "六百ボルト",
    ],
    sourceKind: "government-official-primary",
    sourceUrl:
      "https://laws.e-gov.go.jp/law/335M50000400097?occasion_date=20260809#Mp-At_2",
    sourceLawId: "335M50000400097",
    sourceRevisionId: "335M50000400097_20231228_505M60000400063",
    amendmentPromulgatedOn: "2023-12-28",
    amendmentHistory: [
      {
        revisionId: "335M50000400097_20231228_505M60000400063",
        amendmentLawNumber: "令和五年経済産業省令第六十三号",
        promulgatedOn: "2023-12-28",
        effectiveOn: "2023-12-28",
        status: "enforced",
        sourceUrl:
          "https://laws.e-gov.go.jp/law/335M50000400097?occasion_date=20260809#Mp-At_2",
      },
    ],
    sourceVersionKind: "current",
    sourceFetchedAt: "2026-08-09",
    sourceHash: "febf494082e990aec7776487cfc0761daccc29cf624603913d8f1a5b85107067",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "reviewed",
  },
  {
    law: "経済産業省 よくある質問（電気工事士）",
    lawShort: "経産省電工Q&A",
    articleNum: "Q9・Q10",
    articleTitle: "配線接続と屋内配線への測定器の取付け",
    text:
      "Q9　エアコンの室外機と室内機を接続する工事は、電気工事士が実施すべきか。平成２０年１２月３日付け原子力安全・保安院通知により、６００V以下で使用するエアコンで、室内機及び室外機の端子に接続電線を差し込む作業であれば、「軽微な作業」にあたるため、電気工事士が工事する必要はありません。ただし、当該作業を業とし、継続的に行う場合は、「電気工事業の登録」が必要となります。一方で、「電気工事士法施行規則」第２条で電線を相互に接続する作業は、保安上支障がある作業のため、当該接続線を切断・接続等の作業を伴う場合には電気工事士が工事する必要があります。Q10　屋内配線に測定器を取り付ける場合は電気工事士が実施すべきか。屋内配線を傷付けることが想定されない場合（内線に電圧計、電流計等の測定器をクリップ留め又は巻き付ける場合など）であれば、電気工事士法施行規則第２条第１項第１号ニに当たらないため、電気工事士が工事する必要はありません。但し、自家用電気工作物構内の配電盤など、短絡、感電などの危険を伴う場所については、あらかじめ電気主任技術者の指示確認を行うことが望ましいです。",
    keywords: [
      "測定器",
      "テスター",
      "電圧計",
      "電流計",
      "クリップ留め",
      "配線接続",
      "電気工事士",
      "電気主任技術者",
    ],
    sourceKind: "government-official-primary",
    sourceUrl:
      "https://www.meti.go.jp/policy/safety_security/industrial_safety/sangyo/electric/files/kouzi-si-QA201803.pdf",
    sourceVersionKind: "current",
    sourceFetchedAt: "2026-08-09",
    sourceHash: "f45a3737b3ebc6c043f96a9f8ab845592fbe4adeeb93acf0accbe6ac337d8633",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "reviewed",
  },
] as const satisfies readonly LawArticle[];

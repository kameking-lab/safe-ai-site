export const FUNDING_VERIFIED_ON = "2026-10-14";

export const FUNDING_PURPOSES = [
  { id: "ai-training", label: "AI研修", hint: "担当業務に直結する研修" },
  { id: "safety-training", label: "安全教育", hint: "建設業の所定の技能実習など" },
  { id: "automation", label: "業務自動化", hint: "ITツール・個別システムの導入" },
] as const;
export type FundingPurpose = (typeof FUNDING_PURPOSES)[number]["id"];

export type FundingScheme = {
  id: string;
  purpose: FundingPurpose;
  name: string;
  summary: string;
  company: string;
  costs: string;
  rate: string;
  cap: string;
  conditions: string[];
  excluded: string;
  preparation: string;
  application: string;
  deadline: string;
  closesAt?: string;
  sources: { label: string; url: string }[];
};

// 本文・ガイド・試算で同じルールを参照する。金額は1人当たりの経費助成上限。
export const RESKILLING_RULES = {
  small: { rate: 0.75, classroomCaps: [300_000, 400_000, 500_000], elearningCap: 150_000 },
  large: { rate: 0.6, classroomCaps: [200_000, 250_000, 300_000], elearningCap: 100_000 },
  minimumHours: 10,
} as const;

export const FUNDING_SCHEMES: FundingScheme[] = [
  {
    id: "labor-saving",
    purpose: "automation",
    name: "中小企業省力化投資補助金｜一般型",
    summary: "人手不足を解消する設備・個別システムの導入を計画する場合の候補。",
    company: "従業員を雇用する中小企業・小規模事業者等。従業員ゼロは対象外。",
    costs: "省力化のための機械装置・システム構築費など。個別受託システムも要件次第で候補。",
    rate: "中小企業1/2。小規模・再生事業者2/3。最低賃金の特例は2/3。",
    cap: "通常上限750万〜8,000万円（従業員数による）。大幅賃上げ特例は別枠で最大1億円。",
    conditions: [
      "通常上限は従業員5人以下750万円、6〜20人1,500万円、21〜50人3,000万円、51〜100人5,000万円、101人以上8,000万円。特例は別途要件を確認。",
      "単価税抜50万円以上の機械装置等への投資を1件以上含む必要があります。掲載中の小規模な自動化料金だけで、この要件を満たすとはいえません。",
      "省力化指数、投資回収期間、削減工数を見積もり、労働生産性を年平均4%以上向上させる計画等が必要。",
      "1人当たり給与支給総額を年平均3.5%以上増加、事業場内最低賃金を地域別最低賃金+30円以上とするなどの要件。未達時の返還条件も確認。",
    ],
    excluded:
      "既製SaaSだけの導入、販売用サービス開発、研修のみ。単にAIを使うだけでは対象になりません。",
    preparation:
      "GビズIDプライム、見積、工数・生産性・賃上げ計画等を準備。発注・契約は交付決定後。採択と交付決定は別です。",
    application: "公募回ごとに電子申請。事業実施後に実績報告・検査等を経て補助金を受領。",
    deadline:
      "第8回：2026年10月16日17:00 JST。第9回は確認時点で未公表。直前の相談から間に合うとは約束できません。",
    closesAt: "2026-10-16T17:00:00+09:00",
    sources: [
      { label: "中小機構：一般型", url: "https://shoryokuka.smrj.go.jp/ippan/" },
      { label: "公式：公募日程", url: "https://shoryokuka.smrj.go.jp/ippan/schedule/" },
      {
        label: "公式：第8回公募要領",
        url: "https://shoryokuka.smrj.go.jp/assets/pdf/application_guidelines_ippan_08.pdf",
      },
    ],
  },
  {
    id: "digital-ai",
    purpose: "automation",
    name: "デジタル化・AI導入補助金2026｜通常枠",
    summary:
      "登録済みのITツールで業務を改善する場合の候補。当サービスの登録は未確認。個別開発は対象外。",
    company: "要件を満たす中小企業・小規模事業者等。登録IT導入支援事業者と共同申請。",
    costs: "登録ソフト、クラウド利用料（最大2年）、登録された導入関連役務。",
    rate: "原則1/2。最低賃金に関する要件を満たす場合は2/3。",
    cap: "1業務プロセス以上：5万〜150万円未満。4プロセス以上：150万〜450万円。",
    conditions: [
      "登録IT導入支援事業者と登録ITツールの組み合わせが必要です。安全AIの運営者・サービスの登録は確認できていません。",
      "GビズIDプライム、SECURITY ACTION等を準備。150万円以上は原則、1人当たり給与支給総額を年平均3%以上増加、事業場内最低賃金を地域別最低賃金+30円以上にする等の要件。",
      "過去の交付歴によっては150万円未満にも1人当たり給与支給総額を年平均3.5%以上増加するなどの要件が適用されます。申請履歴と最新要領を確認。",
      "6次の交付決定予定日は2026年12月10日、事業実施・実績報告の期限予定は2027年5月31日。予定は公式日程で再確認。",
    ],
    excluded:
      "スクラッチ開発、追加の個別開発、大幅カスタマイズ、役務のみ、汎用の自動化・分析ツールのみ。一般の受託開発費にそのまま使える制度ではありません。",
    preparation: "登録支援事業者と導入計画を作り申請。契約・導入・支払は交付決定後。",
    application: "公募回の期限までに電子申請。導入後に実績報告を行い、確定後に補助金を受領。",
    deadline: "6次：2026年10月30日17:00 JST。現在の受付可否・次回日程は公式で確認。",
    closesAt: "2026-10-30T17:00:00+09:00",
    sources: [
      { label: "公式：通常枠", url: "https://it-shien.smrj.go.jp/applicant/subsidy/normal/" },
      { label: "公式：申請日程", url: "https://it-shien.smrj.go.jp/schedule" },
      {
        label: "公式：通常枠公募要領",
        url: "https://it-shien.smrj.go.jp/pdf/it2026_koubo_tsujyo.pdf",
      },
      {
        label: "公式：ITツール登録要領",
        url: "https://it-shien.smrj.go.jp/pdf/it2026_manual_it_tool.pdf",
      },
    ],
  },
  {
    id: "workplace-improvement",
    purpose: "automation",
    name: "令和8年度 業務改善助成金",
    summary: "低賃金の事業場で、賃上げと生産性向上の設備投資をセットで行う場合の候補。",
    company:
      "中小企業・小規模事業者等の対象事業場。事業場内最低賃金が令和8年度地域別最低賃金未満等の要件。",
    costs: "生産性向上の設備・システム等。帳票・在庫・顧客管理なども要件により候補。",
    rate: "事業場内最低賃金1,050円未満4/5、1,050円以上3/4。従業員数で決まる率ではありません。",
    cap: "30万〜600万円。賃上げ額・人数・事業場規模等によって異なります。",
    conditions: [
      "50・70・90円の賃上げコース。対象労働者の雇入れから6か月以上等の要件と、地域の最低賃金を確認。",
      "対象経費は税抜10万円以上。個別開発・SaaS・研修・AI相談料が一律に対象になるものではありません。コンサルには資格等の要件があります。",
      "設備発注等は交付決定後。賃上げは申請後から地域別最低賃金の発効前日まで。原則2027年1月31日までに事業完了。",
    ],
    excluded:
      "賃上げだけ、対象外の事業場・費用。東京は2026年9月30日で申請受付終了。全国一律に受付中とはいえません。",
    preparation:
      "事業場の賃金台帳、地域最低賃金の発効日、見積、賃上げ・設備計画を所管労働局と確認。",
    application:
      "交付申請、事業実施、実績報告、支給申請の順。設備導入と賃上げのタイミングは別に確認。",
    deadline:
      "受付は2026年9月1日から、地域別最低賃金の発効前日と11月30日の早い方まで。地域によって既に終了。",
    closesAt: "2026-12-01T00:00:00+09:00",
    sources: [
      {
        label: "厚労省：令和8年度案内",
        url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/zigyonushi/shienjigyou/03.html",
      },
      { label: "厚労省：制度の概要", url: "https://www.mhlw.go.jp/content/11200000/001746707.pdf" },
      {
        label: "厚労省：申請の手引き",
        url: "https://www.mhlw.go.jp/content/11200000/001746753.pdf",
      },
      {
        label: "厚労省：地域別最低賃金",
        url: "https://www.mhlw.go.jp/content/11200000/001753404.pdf",
      },
    ],
  },
  {
    id: "reskilling",
    purpose: "ai-training",
    name: "人材開発支援助成金｜事業展開等リスキリング支援コース",
    summary:
      "DX・事業展開に必要な、職務に直結する原則10時間以上のAI研修が候補。60分・90分講習だけでは対象になりません。",
    company: "雇用保険に加入する事業主と、対象の雇用保険被保険者。大企業も対象。",
    costs: "職務に直結する研修の受講料・外部講師料など。ITツール導入費は別制度。",
    rate: `経費：中小企業${RESKILLING_RULES.small.rate * 100}%／大企業${RESKILLING_RULES.large.rate * 100}%`,
    cap: `対面・同時双方向は1人30〜50万円（大企業20〜30万円）。eラーニング・通信制（対面等との組合せ含む）は${RESKILLING_RULES.small.elearningCap / 10_000}万円（大企業${RESKILLING_RULES.large.elearningCap / 10_000}万円）。`,
    conditions: [
      "事業展開・DX等との関係を計画に示し、原則10時間以上のOFF-JT（通常業務を離れて行う研修）を実施。代表者の受講が自動的に対象になる制度ではありません。",
      "対面・同時双方向研修の経費助成上限：10〜100時間未満30万円、100〜200時間未満40万円、200時間以上50万円。大企業は順に20・25・30万円。",
      "専門実践教育訓練の指定講座は時間数によらず200時間以上の上限区分。定額制サービスは1人1月2万円上限。組合せ・通信制・定額制・指定講座は単純な時間別試算では扱えません。",
      "2026年8月3日以降の計画届に基づくeラーニングは、同一労働者につき年度1回。経費助成上限は中小15万円・大企業10万円。経過措置は公式要領で確認。",
      "賃金助成は中小企業1人1時間1,000円・大企業500円。eラーニング等は賃金助成の対象外。受講・出勤・賃金・支払の記録を保存。",
    ],
    excluded:
      "汎用プロンプトの作り方だけ、AI・DX概論だけの研修や、法定の特別教育等はこのコースでは対象外。掲載中の60分・90分講習だけでは10時間要件を満たしません。",
    preparation: "開始6か月前〜1か月前に計画届。契約・支払・開始前に所管労働局へ確認。",
    application: "訓練終了の翌日から2か月以内に支給申請。",
    deadline:
      "令和8年度末（2027年3月31日）までの時限措置。令和9年度の継続は未確認。計画届の期限にも注意。",
    closesAt: "2027-04-01T00:00:00+09:00",
    sources: [
      {
        label: "厚労省：コースの要領",
        url: "https://www.mhlw.go.jp/content/11800000/001731978.pdf",
      },
      { label: "厚労省：8月3日改正", url: "https://www.mhlw.go.jp/content/11800000/001731966.pdf" },
    ],
  },
  {
    id: "construction-training",
    purpose: "safety-training",
    name: "人材開発支援助成金｜建設労働者技能実習コース",
    summary: "建設会社が、所定の特別教育・安全衛生教育・技能講習を実施する場合の候補。",
    company:
      "要件を満たす中小建設事業主と、対象の雇用保険被保険者である建設労働者。一人親方は対象外。",
    costs:
      "対象一覧に掲載された技能実習の受講料・講師謝金・教材費など。一般的な安全講話は自動的には対象になりません。",
    rate: "中小建設事業主：被保険者20人以下75%。21人以上は受講者35歳未満70%／35歳以上45%。",
    cap: "経費助成は1人・1技能実習につき10万円。",
    conditions: [
      "対象の実習・事業主・労働者を公式一覧で照合。一般の人材育成・リスキリングとは別コースで、所定の法定教育も対象となります。",
      "実習は原則1日1時間以上・6か月以内。種類によって合計10時間以上などの条件が異なります。",
      "中小の賃金助成：被保険者20人以下は1人1日9,500円、21人以上は8,550円、20日上限。賃金助成には原則1日3時間以上などの要件があり、訓練方法によって対象外。",
      "21人以上の率は受講者年齢で変わります。雇用保険の建設事業の料率適用、実習中の賃金支払なども確認。",
    ],
    excluded:
      "一人親方や対象外の実習・受講者。安全AIの教材・講習が、この制度の対象実習や認定講座であるとは保証していません。",
    preparation:
      "原則、開始3か月前〜1週間前に計画届。一部の登録教習機関等の実習には例外があるため事前確認。",
    application: "技能実習終了の翌日から2か月以内に支給申請。",
    deadline:
      "令和8年度要領を確認。実習ごとの計画・支給申請期限と、現在の受付可否を所管労働局へ確認。",
    sources: [
      {
        label: "厚労省：令和8年度要領（8月24日版）",
        url: "https://www.mhlw.go.jp/content/11600000/001741807.pdf",
      },
      {
        label: "厚労省：コースの概要",
        url: "https://www.mhlw.go.jp/content/11600000/001687871.pdf",
      },
    ],
  },
];

export const FUNDING_TRAINING_SUPPLEMENT = [
  {
    name: "通常の職務研修：人材育成支援コース",
    text: "原則10時間以上。経費は中小45%・大企業30%、非正規70%、賃上げ等で15ポイント加算。時間別の1人上限は中小15・30・50万円、大企業10・20・30万円。法定特別教育等は対象外。",
    url: "https://www.mhlw.go.jp/content/11800000/001731967.pdf",
  },
  {
    name: "高度デジタル・定額制：人への投資促進コース",
    text: "高度デジタルは所定のITSS・DSS-P水準等を満たす課程が前提で、中小75%・大企業60%。AI入門なら対象とはいえません。定額制は中小60%・大企業45%（賃上げ等で75%・60%）、修了10時間以上、1人1月2万円上限、賃金助成なし。",
    url: "https://www.mhlw.go.jp/content/11800000/001731974.pdf",
  },
] as const;

export function fundingDeadlineText(scheme: FundingScheme, now?: Date): string {
  if (scheme.closesAt && now && now.getTime() >= Date.parse(scheme.closesAt)) {
    return `記載した期間・公募回は終了しています。次回・継続の有無は公式で確認してください。（確認時の案内：${scheme.deadline}）`;
  }
  return scheme.deadline;
}

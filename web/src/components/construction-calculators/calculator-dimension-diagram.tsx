type DiagramCopy = {
  title: string;
  description: string;
};

const DIAGRAM_COPY: Record<string, DiagramCopy> = {
  "concrete-quantity": {
    title: "コンクリート形状の寸法",
    description: "直方体の長さ、幅、高さと、円柱の直径、高さの関係を示す概略図",
  },
  "excavation-backfill": {
    title: "掘削断面・延長・法勾配",
    description: "掘削底幅、深さ、延長と、水平対鉛直で表す法勾配の関係を示す概略図",
  },
  "average-end-area": {
    title: "前後断面と区間長",
    description: "前断面積A1と後断面積A2、および両断面間の区間長Lの関係を示す概略図",
  },
  "earthwork-conversion-dump-trucks": {
    title: "地山・ほぐし・締固めの土量状態",
    description: "地山土量を基準に、ほぐし率Lと締固め率Cを別々に適用する関係を示す概略図",
  },
  "aggregate-base-quantity": {
    title: "砕石・路盤材の施工面積と層厚",
    description: "施工面積A、仕上がり層厚t、利用者が入力する密度（ロー）の関係を示す概略図",
  },
  "asphalt-mixture-quantity": {
    title: "アスファルト混合物の舗装面積と厚さ",
    description: "舗装面積A、舗装厚t、利用者が入力する密度（ロー）の関係を示す概略図",
  },
  "rebar-weight": {
    title: "鉄筋の直径・長さ・本数",
    description: "円形断面として扱う鉄筋の直径d、1本の長さL、本数Nの関係を示す概略図",
  },
  "rebar-spacing": {
    title: "かぶり・鉄筋径・中心間隔",
    description:
      "左右かぶりをコンクリート表面から鉄筋表面まで、鉄筋径をd、両端鉄筋の中心間を有効幅、隣り合う鉄筋の中心間をピッチとして示す概略図",
  },
  "formwork-area": {
    title: "部材寸法・型枠面・控除面積",
    description: "部材の長さ、幅、高さ、型枠を設置する面、および開口などの控除面積の関係を示す概略図",
  },
  "slope-angle-length": {
    title: "水平距離・高低差・斜長",
    description: "直角三角形による水平距離、鉛直高低差、斜長、角度の関係を示す概略図",
  },
  "drainage-slope": {
    title: "排水の流下方向・延長・標高差",
    description: "始点標高から終点標高へ流下する方向、水平延長、必要高低差、区間標高の関係を示す概略図",
  },
  "scale-coordinate": {
    title: "縮尺変換と局所平面座標",
    description:
      "縮尺1対Sにおける図上寸法と実寸、およびXを北、Yを東とする局所平面座標上の2点間距離と方位角を示す概略図",
  },
};

function DiagramVisual({ slug }: { slug: string }) {
  const arrowId = `dimension-arrow-${slug}`;
  const hatchId = `dimension-hatch-${slug}`;
  const arrow = `url(#${arrowId})`;

  const visual = (() => {
    switch (slug) {
      case "concrete-quantity":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round">
              <path d="M45 100H205V198H45Z M45 100l45-34h160l-45 34 M205 100l45-34v98l-45 34" />
              <path d="M45 226h160" markerStart={arrow} markerEnd={arrow} />
              <path d="M25 100v98" markerStart={arrow} markerEnd={arrow} />
              <path d="M51 87l39-29" markerStart={arrow} markerEnd={arrow} />
              <ellipse cx="435" cy="94" rx="66" ry="23" />
              <path d="M369 94v99c0 13 30 23 66 23s66-10 66-23V94" />
              <path d="M369 94c0 13 30 23 66 23s66-10 66-23" />
              <path d="M369 94h132" markerStart={arrow} markerEnd={arrow} />
              <path d="M530 94v122" markerStart={arrow} markerEnd={arrow} />
            </g>
            <g fill="currentColor" fontSize="15" fontWeight="700">
              <text x="105" y="48">直方体・床版</text>
              <text x="98" y="249">長さ L</text>
              <text x="4" y="154">高さ H</text>
              <text x="42" y="61">幅 W</text>
              <text x="398" y="48">円柱・円形基礎</text>
              <text x="412" y="88">直径 D</text>
              <text x="540" y="161">高さ H</text>
              <text x="330" y="254">個数を掛け、必要に応じてロス率を加算</text>
            </g>
          </>
        );

      case "excavation-backfill":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round">
              <path d="M45 62H595" />
              <path d="M105 62l95 142h240l95-142" />
              <path d="M200 230h240" markerStart={arrow} markerEnd={arrow} />
              <path d="M570 62v142" markerStart={arrow} markerEnd={arrow} />
              <path d="M92 34h170" markerStart={arrow} markerEnd={arrow} />
              <path d="M112 70h70v105" strokeDasharray="7 7" />
              <path d="M112 70h70" markerEnd={arrow} />
              <path d="M182 70v105" markerEnd={arrow} />
            </g>
            <g fill="currentColor" fontSize="15" fontWeight="700">
              <text x="127" y="25">掘削延長 L</text>
              <text x="278" y="253">底幅 W</text>
              <text x="578" y="140">深さ D</text>
              <text x="111" y="94">水平 m</text>
              <text x="187" y="132">鉛直 1</text>
              <text x="244" y="129">法勾配 m : 1</text>
              <text x="234" y="187">構造物・基礎材を控除</text>
            </g>
          </>
        );

      case "average-end-area":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round">
              <path d="M48 205l32-132h138l32 132Z" fill={`url(#${hatchId})`} />
              <path d="M404 205l50-158h110l28 158Z" fill={`url(#${hatchId})`} />
              <path d="M80 73l374-26 M218 73l346-26 M250 205h154 M48 205h356" strokeDasharray="8 7" />
              <path d="M250 235h154" markerStart={arrow} markerEnd={arrow} />
            </g>
            <g fill="currentColor" fontSize="16" fontWeight="700">
              <text x="107" y="132">前断面 A1</text>
              <text x="458" y="132">後断面 A2</text>
              <text x="292" y="259">区間長 L</text>
              <text x="253" y="31">V = (A1 + A2) ÷ 2 × L</text>
            </g>
          </>
        );

      case "earthwork-conversion-dump-trucks":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round">
              <path d="M245 208V91h150v117Z" fill={`url(#${hatchId})`} />
              <path d="M30 208c18-75 54-111 100-111s84 36 104 111Z" fill={`url(#${hatchId})`} />
              <path d="M430 208v-86h180v86Z" fill={`url(#${hatchId})`} />
              <path d="M245 138h-52" markerEnd={arrow} />
              <path d="M395 138h52" markerEnd={arrow} />
              <path d="M30 221h580" />
              <path d="M462 150h116 M462 171h116 M462 192h116" />
            </g>
            <g fill="currentColor" fontSize="15" fontWeight="700" textAnchor="middle">
              <text x="320" y="35">基準：地山土量 Vb</text>
              <text x="320" y="72">地山</text>
              <text x="130" y="248">ほぐし土量 = Vb × L</text>
              <text x="520" y="248">締固め土量 = Vb × C</text>
            </g>
          </>
        );

      case "aggregate-base-quantity":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round">
              <path d="M80 72h390l82 45H162Z" />
              <path d="M162 117h390v76H162Z" fill={`url(#${hatchId})`} />
              <path d="M80 72v76l82 45 M80 148h82" />
              <path d="M586 117v76" markerStart={arrow} markerEnd={arrow} />
              <path d="M80 221h472" markerStart={arrow} markerEnd={arrow} />
            </g>
            <g fill="currentColor" fontSize="16" fontWeight="700">
              <text x="270" y="104">施工面積 A</text>
              <text x="585" y="160" fontSize="14">層厚 t</text>
              <text x="229" y="246">砕石・路盤材の施工範囲</text>
              <text x="234" y="159">入力密度 ρ × 体積</text>
              <text x="201" y="268">密度・ロス率は仕様書等を確認して入力</text>
            </g>
          </>
        );

      case "asphalt-mixture-quantity":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round">
              <path d="M75 72h400l88 45H163Z" />
              <path d="M163 117h400v70H163Z" fill={`url(#${hatchId})`} />
              <path d="M75 72v70l88 45 M75 142h88" />
              <path d="M596 117v70" markerStart={arrow} markerEnd={arrow} />
              <path d="M75 216h488" markerStart={arrow} markerEnd={arrow} />
              <path d="M178 137h368 M178 158h368" />
            </g>
            <g fill="currentColor" fontSize="16" fontWeight="700">
              <text x="272" y="103">舗装面積 A</text>
              <text x="580" y="157" fontSize="14">舗装厚 t</text>
              <text x="242" y="241">アスファルト混合物の施工範囲</text>
              <text x="235" y="154">入力密度 ρ × 体積</text>
              <text x="206" y="268">密度・ロス率は配合・仕様を確認して入力</text>
            </g>
          </>
        );

      case "rebar-weight":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M65 121h410 M65 143h410" />
              <path d="M92 117l18 30 M137 117l18 30 M182 117l18 30 M227 117l18 30 M272 117l18 30 M317 117l18 30 M362 117l18 30 M407 117l18 30" />
              <path d="M65 190h410" markerStart={arrow} markerEnd={arrow} />
              <circle cx="552" cy="132" r="42" fill={`url(#${hatchId})`} />
              <path d="M552 90v84" markerStart={arrow} markerEnd={arrow} />
            </g>
            <g fill="currentColor" fontSize="16" fontWeight="700">
              <text x="236" y="111">鉄筋 1本</text>
              <text x="239" y="216">長さ L</text>
              <text x="563" y="137">直径 d</text>
              <text x="500" y="64">円形断面</text>
              <text x="70" y="55">本数 N　総延長 = L × N</text>
              <text x="149" y="255">単位重量は断面積 × 鉄の密度から算出</text>
            </g>
          </>
        );

      case "rebar-spacing":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round">
              <rect x="55" y="70" width="530" height="136" />
              {[120, 220, 320, 420, 520].map((cx) => (
                <circle key={cx} cx={cx} cy="137" r="12" fill={`url(#${hatchId})`} />
              ))}
              <path d="M55 52h53" markerStart={arrow} markerEnd={arrow} />
              <path d="M532 52h53" markerStart={arrow} markerEnd={arrow} />
              <path d="M120 106h100" markerStart={arrow} markerEnd={arrow} />
              <path d="M120 181h400" markerStart={arrow} markerEnd={arrow} />
              <path d="M320 125v24" markerStart={arrow} markerEnd={arrow} />
              <path d="M55 232h530" markerStart={arrow} markerEnd={arrow} />
              <path d="M108 52v73 M532 52v73" strokeDasharray="5 5" />
              <path d="M120 106v75 M220 106v75 M520 125v56" strokeDasharray="5 5" />
            </g>
            <g fill="currentColor" fontSize="14" fontWeight="700">
              <text x="64" y="43">左かぶり cL</text>
              <text x="493" y="43">右かぶり cR</text>
              <text x="129" y="98">中心間ピッチ p</text>
              <text x="232" y="174">有効幅（両端鉄筋の中心間）</text>
              <text x="330" y="141">径 d</text>
              <text x="278" y="257">施工幅 W</text>
              <text x="53" y="22">かぶり：コンクリート表面 → 鉄筋表面</text>
              <text x="292" y="278">有効幅 = W − cL − cR − d</text>
            </g>
          </>
        );

      case "formwork-area":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round">
              <path d="M105 83h300v135H105Z" fill={`url(#${hatchId})`} />
              <path d="M405 83l95-48v135l-95 48Z" fill={`url(#${hatchId})`} />
              <path d="M105 83l95-48h300l-95 48" />
              <rect
                x="225"
                y="128"
                width="76"
                height="54"
                strokeDasharray="7 6"
                fill="currentColor"
                fillOpacity="0.08"
              />
              <path d="M105 244h300" markerStart={arrow} markerEnd={arrow} />
              <path d="M75 83v135" markerStart={arrow} markerEnd={arrow} />
              <path d="M420 72l80-41" markerStart={arrow} markerEnd={arrow} />
            </g>
            <g fill="currentColor" fontSize="15" fontWeight="700">
              <text x="214" y="65">選択した型枠面</text>
              <text x="218" y="119">控除面積</text>
              <text x="232" y="267">長さ L</text>
              <text x="25" y="156">高さ H</text>
              <text x="451" y="47">幅 W</text>
              <text x="441" y="254">面数・個数を反映</text>
            </g>
          </>
        );

      case "slope-angle-length":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round">
              <path d="M80 216h450V55Z" />
              <path d="M80 246h450" markerStart={arrow} markerEnd={arrow} />
              <path d="M566 216V55" markerStart={arrow} markerEnd={arrow} />
              <path d="M111 216a31 31 0 0 1 3-13 31 31 0 0 1 20-17" />
              <path d="M530 216h-22v-22" />
            </g>
            <g fill="currentColor" fontSize="16" fontWeight="700">
              <text x="265" y="270">水平距離 Δx</text>
              <text x="548" y="145" transform="rotate(-90 548 145)">高低差 Δh</text>
              <text x="301" y="120" transform="rotate(-20 301 120)">斜長 S</text>
              <text x="120" y="211">角度 θ</text>
              <text x="76" y="42">勾配 = Δh ÷ Δx　（%、‰、1:nへ変換）</text>
            </g>
          </>
        );

      case "drainage-slope":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M75 74L540 190" />
              <path d="M176 99l178 45" markerEnd={arrow} strokeWidth="5" />
              <path d="M75 74v151 M540 190v35" strokeDasharray="7 6" />
              <path d="M75 248h465" markerStart={arrow} markerEnd={arrow} />
              <path d="M575 74v116" markerStart={arrow} markerEnd={arrow} />
              <path d="M230 113v112 M385 151v74" strokeDasharray="5 6" />
              <circle cx="75" cy="74" r="6" fill="currentColor" />
              <circle cx="230" cy="113" r="5" fill="currentColor" />
              <circle cx="385" cy="151" r="5" fill="currentColor" />
              <circle cx="540" cy="190" r="6" fill="currentColor" />
              <path d="M52 225h510" />
            </g>
            <g fill="currentColor" fontSize="15" fontWeight="700">
              <text x="56" y="57">始点標高 Zs</text>
              <text x="460" y="180">終点標高 Ze</text>
              <text x="242" y="92">流下方向</text>
              <text x="250" y="271">水平延長 L</text>
              <text x="548" y="57">高低差 Δh</text>
              <text x="193" y="216">区間ごとの標高</text>
            </g>
          </>
        );

      case "scale-coordinate":
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M305 32v215" strokeDasharray="7 7" />
              <path d="M45 101h188" markerStart={arrow} markerEnd={arrow} />
              <path d="M45 191h225" markerStart={arrow} markerEnd={arrow} />
              <path d="M365 231V39" markerEnd={arrow} />
              <path d="M365 231h235" markerEnd={arrow} />
              <path d="M405 197L522 82" strokeWidth="4" />
              <path d="M405 197h117V82" strokeDasharray="6 6" />
              <circle cx="405" cy="197" r="6" fill="currentColor" />
              <circle cx="522" cy="82" r="6" fill="currentColor" />
              <path d="M405 160a37 37 0 0 1 26 11" />
              <path d="M405 197v-43" strokeDasharray="5 5" />
            </g>
            <g fill="currentColor" fontSize="14" fontWeight="700">
              <text x="44" y="40">モードA　縮尺 1 : S</text>
              <text x="101" y="90">図上寸法 l</text>
              <text x="111" y="181">実寸 L = l × S</text>
              <text x="72" y="139">同じ単位へ換算してから計算</text>
              <text x="340" y="23">モードB　局所平面座標</text>
              <text x="335" y="48">X 北</text>
              <text x="562" y="250">Y 東</text>
              <text x="376" y="218">P1</text>
              <text x="531" y="80">P2</text>
              <text x="449" y="213">ΔY</text>
              <text x="528" y="145">ΔX</text>
              <text x="443" y="124" transform="rotate(-44 443 124)">水平距離</text>
              <text x="414" y="157">方位角</text>
              <text x="327" y="272">方位角：+X（北）から時計回り</text>
            </g>
          </>
        );

      default:
        return (
          <>
            <g stroke="currentColor" strokeWidth="3" fill="none">
              <rect x="90" y="65" width="460" height="145" strokeDasharray="8 7" />
              <path d="M125 238h390" markerStart={arrow} markerEnd={arrow} />
            </g>
            <text x="205" y="145" fill="currentColor" fontSize="18" fontWeight="700">
              入力寸法の関係
            </text>
          </>
        );
    }
  })();

  return (
    <>
      <defs>
        <marker
          id={arrowId}
          markerWidth="7"
          markerHeight="7"
          refX="3.5"
          refY="3.5"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0 0L7 3.5L0 7Z" fill="currentColor" stroke="none" />
        </marker>
        <pattern id={hatchId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <path d="M0 0V10" stroke="currentColor" strokeWidth="2" />
        </pattern>
      </defs>
      {visual}
    </>
  );
}

export function CalculatorDimensionDiagram({ slug }: { slug: string }) {
  const copy = DIAGRAM_COPY[slug] ?? {
    title: "入力寸法の関係",
    description: "入力寸法と計算結果の関係を示す概略図",
  };
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-");

  return (
    <figure className="rounded-2xl border-2 border-slate-300 bg-white p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
      <div
        className="-mx-1 overflow-x-auto px-1 pb-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500"
        role="region"
        tabIndex={0}
        aria-label={`${copy.title}の図。横方向にスクロールできます`}
      >
        <svg
          role="img"
          aria-labelledby={`diagram-${safeSlug}-title diagram-${safeSlug}-description`}
          viewBox="0 0 640 280"
          className="h-auto min-w-[560px] w-full max-w-full"
          focusable="false"
        >
          <title id={`diagram-${safeSlug}-title`}>{copy.title}</title>
          <desc id={`diagram-${safeSlug}-description`}>{copy.description}</desc>
          <DiagramVisual slug={safeSlug} />
        </svg>
      </div>
      <figcaption className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200 forced-colors:text-[CanvasText]">
        {copy.title}。図は入力関係を示す概略で、設計図ではありません。
      </figcaption>
    </figure>
  );
}

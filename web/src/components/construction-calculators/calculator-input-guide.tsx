import type { InputDefinition } from "@/lib/construction-calculators/types";
export const INPUT_COLORS = ["border-sky-500 bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-100", "border-orange-500 bg-orange-50 text-orange-950 dark:bg-orange-950 dark:text-orange-100", "border-violet-500 bg-violet-50 text-violet-950 dark:bg-violet-950 dark:text-violet-100", "border-teal-500 bg-teal-50 text-teal-950 dark:bg-teal-950 dark:text-teal-100"];
const STROKES = ["#0369a1", "#c2410c", "#7e22ce", "#0f766e"];
export function inputUnit(field: InputDefinition, raw: Record<string, unknown>): string {
    if (!field.units?.length)
        return ({ quantity: field.label.includes("本") ? "本" : "個", layers: "段", faces: "面", intervalCount: "区間" } as Record<string, string>)[field.key] ?? "";
    if (field.units.length === 1)
        return field.units[0].replace("m2", "m²").replace("m3", "m³");
    const unitKeys: Record<string, string> = { structureVolume: "deductionVolumeUnit", baseMaterialVolume: "deductionVolumeUnit", drawingLength: "drawingUnit", actualLength: "actualUnit", x1: "coordinateUnit", y1: "coordinateUnit", x2: "coordinateUnit", y2: "coordinateUnit" };
    if (field.key === "gradeValue")
        return raw.gradeMode === "permille" ? "‰" : raw.gradeMode === "ratio" ? "1:n" : "%";
    const unit = raw[unitKeys[field.key] ?? field.key + "Unit"] ?? raw.dimensionUnit ?? raw.lengthUnit ?? field.units[0];
    return String(unit).replace("m2", "m²").replace("m3", "m³");
}
export function CalculatorInputGuide({ slug, fields, raw }: {
    slug: string;
    fields: InputDefinition[];
    raw: Record<string, unknown>;
}) {
    const numeric = fields.filter(f => f.type === "number" || f.type === "integer");
    const focus = (key: string) => document.getElementById("construction-calculator-" + key)?.focus();
    const marker = (key: string, x: number, y: number, line?: string, label?: string) => {
        const i = numeric.findIndex(f => f.key === key), field = numeric[i];
        if (!field)
            return null;
        return <g key={key}>
            {line ? <path d={line} stroke={STROKES[i % 4]} strokeWidth="3" fill="none"/> : null}
            <g role="button" tabIndex={0} aria-label={(i + 1) + ". " + field.label + "の入力へ"} onClick={() => focus(key)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            focus(key);
        } }} className="cursor-pointer outline-none focus:opacity-60">
                <rect x={x - 34} y={y - 34} width="68" height="68" fill="transparent" pointerEvents="all"/>
                <circle cx={x} cy={y} r="12" fill={STROKES[i % 4]}/><text x={x} y={y + 4} fill="white" textAnchor="middle" fontSize="13" fontWeight="bold">{i + 1}</text>
            </g>
            {label ? <text x={x + 16} y={y + 4} fill="currentColor" fontSize="12" fontWeight="bold" pointerEvents="none">{label}</text> : null}
        </g>;
    };
    const box = <path d="M100 55h145v70H100Z M100 55l35-25h145l-35 25 M245 55l35-25v70l-35 25"/>;
    const circle = <><ellipse cx="180" cy="40" rx="65" ry="17"/><path d="M115 40v80c0 25 130 25 130 0V40" fill="none"/></>;
    const panel = ["curing-sheet-quantity", "board-panel-quantity", "wire-mesh-quantity"].includes(slug);
    let visual;
    if (slug === "polygon-area") {
        const points = Array.isArray(raw.points) ? raw.points as {
            x: unknown;
            y: unknown;
        }[] : [];
        const values = points.map((p, index) => ({ ...p, index })).filter(p => p.x !== "" && p.y !== "" && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))).map(p => ({ x: Number(p.x), y: Number(p.y), index: p.index }));
        const minX = Math.min(...values.map(p => p.x)), minY = Math.min(...values.map(p => p.y));
        const rangeX = Math.max(...values.map(p => p.x)) - minX || 1, rangeY = Math.max(...values.map(p => p.y)) - minY || 1;
        const positions = values.map(p => ({ x: 60 + (p.y - minY) / rangeY * 230, y: 135 - (p.x - minX) / rangeX * 100, index: p.index }));
        visual = <><g fill="#e0f2fe" stroke="#0369a1" strokeWidth="2"><polygon points={positions.map(p => p.x + "," + p.y).join(" ")}/></g>{positions.map((p, i) => <g key={i} role="button" tabIndex={0} aria-label={"点" + (p.index + 1) + "のX座標へ"} onClick={() => focus("point-" + p.index + "-x")} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            focus("point-" + p.index + "-x");
        } }}><rect x={p.x - 34} y={p.y - 34} width="68" height="68" fill="transparent" pointerEvents="all"/><circle cx={p.x} cy={p.y} r="12" fill={STROKES[p.index % 4]}/><text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize="13">{p.index + 1}</text></g>)}<text x="8" y="22" fill="currentColor" fontSize="12">X 北 ↑　Y 東 →（m）</text>{!values.length ? <text x="95" y="88" fill="currentColor" fontSize="14">座標を入れると形を表示</text> : null}</>;
    }
    else if (panel)
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2"><rect x="50" y="35" width="160" height="90"/><rect x="247" y="62" width="65" height="45"/></g>{marker("coverLength", 115, 149, "M50 137H210", "長さ")}{marker("coverWidth", 24, 80, "M37 35V125")}{marker("pieceWidth", 275, 127, "M247 116H312")}{marker("pieceLength", 335, 85, "M324 62V107")}<text x="65" y="27" fill="currentColor" fontSize="12">覆う範囲（m）</text><text x="245" y="48" fill="currentColor" fontSize="12">材料1枚</text></>;
    else if (slug === "concrete-quantity") {
        const circular = raw.shape === "cylinder" || raw.shape === "circular-foundation";
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2">{circular ? circle : box}</g>{circular ? marker("diameter", 180, 17, "M115 40H245", "直径") : marker("length", 170, 151, "M100 137H245", "長さ")}{marker("height", 80, 90, "M93 55V125")}{!circular ? marker("width", 288, 28, "M254 48L287 24") : null}</>;
    }
    else if (slug === "excavation-backfill")
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2"><path d={raw.shape === "vertical" ? "M75 40H280V125H75Z" : "M55 40H300L260 125H95Z"}/></g>{marker("width", 177, 148, "M95 137H260", "底幅")}{marker("depth", 326, 83, "M310 40V125")}{raw.shape !== "vertical" ? marker("sideSlopeHorizontalPerVertical", 40, 83, undefined, "法勾配") : null}<text x="84" y="25" fill="currentColor" fontSize="12">延長は溝に沿って測る（図は断面）</text></>;
    else if (slug === "slope-angle-length" || slug === "drainage-slope")
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2"><path d="M65 125H275V35Z"/></g>{marker(slug === "drainage-slope" ? "length" : "horizontalDistance", 160, 150, "M65 138H275", "水平距離")}{marker("rise", 310, 80, "M292 35V125")}{marker("gradeValue", 167, 66, undefined, "勾配")}{marker("slopePercent", 167, 66, undefined, "勾配")}{marker("angleDegrees", 85, 107, undefined, "角度")}{marker("ratioN", 167, 66, undefined, "1:n")}{marker("referenceElevationM", 30, 95, undefined, "標高")}</>;
    else if (slug === "aggregate-base-quantity" || slug === "asphalt-mixture-quantity")
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2">{box}</g>{marker("area", 164, 83, undefined, "施工面積")}{marker("thickness", 308, 92, "M292 55V125", "厚さ")}<text x="108" y="152" fill="currentColor" fontSize="12">密度は材料の仕様書から入力</text></>;
    else if (slug === "rebar-weight")
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2"><rect x="55" y="60" width="235" height="18" rx="8"/><circle cx="315" cy="68" r="13"/></g>{marker("length", 160, 111, "M55 94H290", "1本の長さ")}{marker("diameterMm", 315, 37, "M315 55V81")}<text x="75" y="143" fill="currentColor" fontSize="13">{raw.barType === "deformed" ? "異形鉄筋：" + String(raw.barDesignation ?? "呼び名を選択") : "丸鋼：直径を測る"}</text></>;
    else if (slug === "rebar-spacing")
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2"><rect x="50" y="53" width="250" height="75"/>{[85, 140, 195, 250].map(x => <circle key={x} cx={x} cy="91" r="9"/>)}</g>{marker("constructionWidth", 165, 152, "M50 140H300", "全幅")}{marker("leftCover", 55, 25, "M50 42H76")}{marker("rightCover", 290, 25, "M259 42H300")}{marker("requestedPitch", 122, 63, "M85 74H140")}<text x="69" y="117" fill="currentColor" fontSize="11">かぶりは表面まで・ピッチは中心間</text></>;
    else if (slug === "formwork-area")
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2">{box}</g>{marker("length", 165, 151, "M100 137H245", "長さ")}{marker("width", 290, 27, "M255 47L289 23")}{marker("height", 73, 91, "M92 55V125")}<text x="120" y="88" fill="currentColor" fontSize="12">{raw.shape === "beam" ? "側面2面＋底面" : raw.shape === "wall" || raw.shape === "slab-edge" ? "選んだ側面だけ" : raw.shape === "custom" ? "指定した面数" : "側面4面"}</text><text x="118" y="110" fill="currentColor" fontSize="11">天端・接合面は含まない</text></>;
    else if (slug === "average-end-area")
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2"><path d="M45 115l20-70h60l20 70Z M230 115l15-90h70l20 90Z"/><path d="M145 128H230"/></g><text x="63" y="88" fill="currentColor" fontSize="13">前断面</text><text x="255" y="88" fill="currentColor" fontSize="13">後断面</text><text x="150" y="150" fill="currentColor" fontSize="13">区間長</text></>;
    else if (slug === "earthwork-conversion-dump-trucks")
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2"><rect x="115" y="25" width="130" height="50"/><path d="M180 75l-90 40 M180 75l90 40"/><rect x="20" y="110" width="115" height="40"/><rect x="220" y="110" width="120" height="40"/></g>{marker("bankVolume", 138, 50, undefined, "地山")}{marker("bulkingFactor", 52, 100, undefined, "ほぐし率")}{marker("compactionFactor", 220, 100, undefined, "締固め率")}<text x="42" y="135" fill="currentColor" fontSize="13">ほぐした土</text><text x="236" y="135" fill="currentColor" fontSize="13">締固めた土</text></>;
    else if (slug === "paint-quantity")
        visual = <><g fill="#e2e8f0" stroke="#64748b" strokeWidth="2"><rect x="58" y="30" width="140" height="100"/><rect x="258" y="70" width="53" height="60"/><path d="M268 70V58h33v12"/></g>{marker("area", 84, 67, undefined, "塗る面積")}{marker("packMass", 267, 149, undefined, "1缶容量")}<text x="71" y="153" fill="currentColor" fontSize="12">1回の使用量 × 塗る回数</text></>;
    else if (slug === "scale-coordinate")
        visual = raw.mode === "coordinate" ? <><g stroke="#64748b" strokeWidth="2" fill="none"><path d="M90 130V20 M90 130H300 M130 105L260 40"/></g><text x="65" y="18" fill="currentColor" fontSize="12">X 北</text><text x="300" y="148" fill="currentColor" fontSize="12">Y 東</text>{marker("x1", 113, 95, undefined, "点1")}{marker("x2", 250, 25, undefined, "点2")}</> : <><g stroke="#64748b" strokeWidth="2" fill="none"><path d="M70 53H250 M70 118H300"/></g>{marker(raw.solveFor === "drawing" ? "actualLength" : "drawingLength", 90, 33, undefined, raw.solveFor === "drawing" ? "現場の実寸" : "図で測る長さ")}{marker("scaleDenominator", 175, 85, undefined, "縮尺 1:N")}<text x="83" y="148" fill="currentColor" fontSize="12">求めたい寸法へ単位をそろえて換算</text></>;
    return <figure className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800" aria-label="図の番号と同じ番号の欄へ入力">
  <figcaption className="text-xs font-bold">図の番号を押すと入力欄へ。図は概略です。</figcaption>
  <svg viewBox="0 0 360 170" role="group" aria-label="測る場所と入力欄の関係" className="mx-auto h-28 w-full max-w-md text-slate-900 dark:text-white">{visual}</svg>
  <div className="mt-1 grid grid-cols-3 gap-1">{numeric.slice(0, panel ? 4 : 3).map((field, i) => <button key={field.key} type="button" onClick={() => focus(field.key)} className={"min-h-11 rounded-md border-l-4 p-1 text-left text-xs font-bold " + INPUT_COLORS[i % 4]}>{i + 1}. {field.label}<span className="block tabular-nums">{raw[field.key] === "" || raw[field.key] == null ? "未入力" : String(raw[field.key])} {inputUnit(field, raw)}</span></button>)}</div>
 </figure>;
}

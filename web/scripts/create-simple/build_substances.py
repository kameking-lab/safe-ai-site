"""
厚生労働省 CREATE-SIMPLE ver3.2.1（CREATE-SIMPLE_ver3.2.1.xlsm）の非表示シート SubstanceList を、
サイトの判定で使う JSON（web/src/data/create-simple/substances.json）へ変換する。

使い方（Excel のマクロは実行しない。openpyxl で値を読むだけ）:
    python -I build_substances.py <CREATE-SIMPLE_ver3.2.1.xlsm> <出力JSON>

列番号は SubstanceList の列（VBA の ChemData(j) の j）と一致させている。
- GHS: 6〜37 列
- ばく露限界値: 44〜47（濃度基準値）, 50〜53（日本産業衛生学会）, 57〜62（ACGIH）, 66〜69（DFG）
- 物化性状: 72〜80
- 法規制: 81〜93
数値の文字列は Excel が ja-JP でセルへ書き込んだときと同じ解釈（桁区切りのカンマは無視）で数値化する。
"""
import json
import sys

import openpyxl

GHS_KEYS = ["explosives", "flamGas", "aerosol", "oxGas", "gasesUnderPressure", "flamLiq", "flamSol", "selfReact",
            "pyrLiq", "pyrSol", "selfHeat", "waterReact", "oxLiq", "oxSol", "orgPerox", "metCorr", "inertExplosives",
            "acuteToxOral", "acuteToxDermal", "acuteToxInhalationGases", "acuteToxInhalationVapors",
            "acuteToxInhalationDustOrMist", "skinCorrOrIrrit", "eyeCorrOrIrrit", "respSens", "skinSens", "muta",
            "carc", "repr", "stotSe", "stotRe", "aspTox"]
OEL_COLS = [44, 45, 46, 47, 50, 51, 52, 53, 57, 58, 59, 60, 61, 62, 66, 67, 68, 69]


def vb_cstr(v):
    if v is None or v == "":
        return ""
    if isinstance(v, (int, float)):
        if float(v).is_integer() and abs(v) < 1e15:
            return str(int(v))
        s = "%.15G" % v
        if "E" not in s and "." in s:
            s = s.rstrip("0").rstrip(".")
        return s
    return str(v)


def num(v):
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(vb_cstr(v)) if not float(v).is_integer() else int(v)
    t = str(v).strip().replace(",", "")
    try:
        f = float(t)
    except ValueError:
        return None
    return int(f) if f.is_integer() else f


def text(v):
    return vb_cstr(v)


def main(src, dst):
    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    ws = wb["SubstanceList"]
    out = []
    for r in ws.iter_rows(min_row=5, values_only=True):
        if not r[0]:
            continue
        c = lambda j: r[j - 1] if len(r) >= j else None
        ghs = {}
        for n, key in enumerate(GHS_KEYS):
            v = vb_cstr(c(6 + n))
            if v != "":
                ghs[key] = v
        oel = [num(c(j)) for j in OEL_COLS]
        ptype = num(c(72))
        phys = [ptype if ptype in (1, 2, 3) else None, num(c(73)), num(c(74)), num(c(75)), num(c(76)),
                num(c(77)), text(c(78)), num(c(79)), text(c(80))]
        reg = [vb_cstr(c(j)) for j in range(81, 94)]
        out.append([str(r[0]).strip(), vb_cstr(c(2)), vb_cstr(c(4)), ghs, oel, phys, reg])
    payload = {
        "source": {
            "title": "厚生労働省 CREATE-SIMPLE ver3.2.1 物質リスト（SubstanceList）",
            "url": "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/CREATE-SIMPLE_ver3.2.1.xlsm",
            "designDocument": "CREATE-SIMPLE の設計基準（2025年6月）",
            "count": len(out),
        },
        "substances": out,
    }
    with open(dst, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(len(out))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

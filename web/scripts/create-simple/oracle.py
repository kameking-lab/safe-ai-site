"""
CREATE-SIMPLE ver3.2.1 の VBA（modCalc / modRASheet.RunRAinRAsheet / modFunction.CasSearch /
wsRA.Worksheet_Change）を、行単位でそのまま Python に写した検証用オラクル。

- ROUNDDOWN / LOG は Excel 本体の WorksheetFunction を COM 経由で呼ぶ（空のExcelアプリ。
  公式ブックは開かず、マクロも実行しない）。
- VBA の Integer/Boolean のビット演算（True = -1）も再現する。
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
# 公式 xlsm から extract_official.py で作った substance_list_raw.json / descs.json の置き場所
WORK = os.environ.get("CREATE_SIMPLE_WORK", HERE)
NA = -9999

# ---------------------------------------------------------------- Excel COM
_xl = None
_cache_rd = {}
_cache_log = {}


def _excel():
    global _xl
    if _xl is None:
        import win32com.client
        _xl = win32com.client.DispatchEx("Excel.Application")
        _xl.Visible = False
        _xl.DisplayAlerts = False
        _xl.AutomationSecurity = 3  # マクロ強制無効
    return _xl


def close_excel():
    global _xl
    if _xl is not None:
        _xl.Quit()
        _xl = None


def xl_rounddown(x, d):
    key = (x, d)
    if key not in _cache_rd:
        _cache_rd[key] = float(_excel().WorksheetFunction.RoundDown(x, d))
    return _cache_rd[key]


def xl_log(x):
    if x <= 0:
        raise ZeroDivisionError("Log of non-positive")
    if x not in _cache_log:
        _cache_log[x] = float(_excel().WorksheetFunction.Log(x))
    return _cache_log[x]


def vb_int(x):
    return math.floor(x)


def round_sig_down(x, base):
    # WorksheetFunction.RoundDown(x, base - Int(WorksheetFunction.Log(Abs(x))))
    return xl_rounddown(x, base - vb_int(xl_log(abs(x))))


def cint(x):
    # VBA CInt: 偶数丸め
    f = math.floor(x)
    diff = x - f
    if diff > 0.5:
        return f + 1
    if diff < 0.5:
        return f
    return f if f % 2 == 0 else f + 1


def vb_bool_int(b):
    return -1 if b else 0


# ---------------------------------------------------------------- 公式物質リスト
_SUBST = None


def substance_list():
    global _SUBST
    if _SUBST is None:
        rows = json.load(open(os.path.join(WORK, "substance_list_raw.json"), encoding="utf-8"))
        _SUBST = {r["1"]: r for r in rows}
    return _SUBST


def vb_cstr(v):
    """VLookup の戻りを String 変数へ入れたときの文字列（数値は15桁表記）"""
    if v is None or v == "":
        return ""
    if isinstance(v, bool):
        return "True" if v else "False"
    if isinstance(v, (int, float)):
        if float(v).is_integer() and abs(v) < 1e15:
            return str(int(v))
        s = "%.15G" % v
        if "E" in s:
            mant, exp = s.split("E")
            if "." in mant:
                mant = mant.rstrip("0").rstrip(".")
            e = int(exp)
            return "%sE%s%02d" % (mant, "-" if e < 0 else "+", abs(e))
        if "." in s:
            s = s.rstrip("0").rstrip(".")
        return s
    return str(v)


def cell_parse(s):
    """String をセルに代入したときの Excel の解釈（ja-JP）。数値なら float、空なら None。"""
    if s is None or s == "":
        return None
    if isinstance(s, (int, float)):
        return float(s)
    t = s.strip()
    t2 = t.replace(",", "")
    try:
        return float(t2)
    except ValueError:
        return s


# ---------------------------------------------------------------- modCalc
def calculate_dermal_absorption(mw, vp, sol, logkow, ptype, hours, area, glove):
    try:
        if mw <= 0 or vp < 0 or sol < 0 or (ptype != 1 and ptype != 2) or logkow == -9999 or hours <= 0 or area <= 0 or glove <= 0:
            return -9999
        R = 8.314
        AirVelocity = 1080
        KinematicViscosity = 0.054
        EvaporationAreaLength = 0.1
        Temperature = 293
        LogKpSc = -1.326 + 0.6097 * logkow - 0.1786 * math.sqrt(mw)
        KpSc = 10 ** LogKpSc
        KPol = 0.0001519 / math.sqrt(mw)
        KAq = 2.5 / math.sqrt(mw)
        Kp = 1 / ((1 / (KpSc + KPol)) + 1 / KAq)
        AbsorptionRate = Kp * sol
        MolecularDiffusivity = 0.06 * (76 / mw) ** (1 / 2)
        Beta = (0.0111 * (AirVelocity ** 0.96) * (MolecularDiffusivity ** 0.19)) / ((KinematicViscosity ** 0.15) * (EvaporationAreaLength ** 0.04))
        Evap = (Beta * vp * mw) / (R * Temperature * 10)
        if ptype == 1:
            ret = 7 / (AbsorptionRate + Evap)
        else:
            ret = 3 / (AbsorptionRate + Evap)
        total = hours + ret
        if total > 10:
            total = 10
        da = AbsorptionRate * total * area * glove
        da = round_sig_down(da, 2)
        return da
    except (ZeroDivisionError, OverflowError, ValueError):
        return -9999


def get_unit(ptype):
    return "ppm" if ptype in (1, 3) else "mg/m3"


def select_oel_8h(ptype, cs8, cs8u, jsoh, jsohu, twa, twau, mak, maku, oth, othu, sel):
    unit = get_unit(ptype)
    minv = 99999
    pref = 0
    if sel in (0, 1):
        if cs8u == unit:
            pref = cs8
    elif sel == 2:
        if jsohu == unit:
            pref = jsoh
    elif sel == 3:
        if twau == unit:
            pref = twa
    elif sel == 4:
        if maku == unit:
            pref = mak
    elif sel == 5:
        if othu == unit:
            pref = oth
    if pref > 0:
        return pref
    for v, u in ((cs8, cs8u), (jsoh, jsohu), (twa, twau), (mak, maku), (oth, othu)):
        if u == unit and v > 0:
            minv = min(minv, v)
    return -9999 if minv == 99999 else minv


def select_oel_short(ptype, csst, csstu, jsohc, jsohcu, stel, stelu, c, cu, peak, peaku, oth, othu, cs8, cs8u, sel, sel8, acr):
    unit = get_unit(ptype)
    minv = 99999
    pref = 0
    if sel in (0, 1):
        if csstu == unit:
            pref = csst
    elif sel == 2:
        if jsohcu == unit:
            pref = jsohc
    elif sel == 3:
        if stelu == unit and stel > 0:
            pref = stel
        elif cu == unit and c > 0:
            pref = c
    elif sel == 4:
        if peaku == unit:
            pref = peak
    elif sel == 5:
        if othu == unit:
            pref = oth
    if pref > 0:
        return pref
    if cs8u == unit and cs8 > 0:
        return cs8 * 3
    for v, u in ((csst, csstu), (jsohc, jsohcu), (stel, stelu), (c, cu), (peak, peaku), (oth, othu)):
        if u == unit and v > 0:
            minv = min(minv, v)
    if minv == 99999:
        if sel8 > 0:
            return sel8 * 3
        if acr > 0:
            return acr * 3
        return -9999
    return minv


def calculate_acr_max(g, ptype):
    liq = ptype in (1, 3)
    o = g["AcuteToxOral"]; ig = g["AcuteToxInhalationGases"]; iv = g["AcuteToxInhalationVapors"]; idm = g["AcuteToxInhalationDustOrMist"]
    inh_missing = ig == "-9999" or iv == "-9999" or idm == "-9999"
    sk = g["SkinCorrOrIrrit"]; ey = g["EyeCorrOrIrrit"]; rs = g["RespSens"]; ss = g["SkinSens"]
    mu = g["Muta"]; ca = g["Carc"]; rp = g["Repr"]; se = g["STOTSE"]; re_ = g["STOTRE"]
    if (o == "1" and inh_missing) or ig == "1" or iv == "1" or idm == "1" or mu in ("1", "1A", "1B") or ca in ("1", "1A", "1B"):
        return 0.05 if liq else 0.001
    if (o == "2" and inh_missing) or ig == "2" or iv == "2" or idm == "2" or sk == "1A" or rs in ("1", "1A", "1B") or mu in ("2", "2A", "2B") or ca in ("2", "2A", "2B") or rp in ("1A", "1B", "1") or re_ == "1":
        return 0.5 if liq else 0.01
    if (o == "3" and inh_missing) or ig == "3" or iv == "3" or idm == "3" or sk in ("1B", "1C", "1") or ey == "1" or ss in ("1", "1A", "1B") or rp == "2" or se == "1" or re_ == "2":
        return 5 if liq else 0.1
    if (o == "4" and inh_missing) or ig == "4" or iv == "4" or idm == "4" or sk == "2" or ey == "2" or se in ("2", "3"):
        return 50 if liq else 1
    return 500 if liq else 10


def calculate_oel_dermal(sel8, acr, prop, mw):
    std = acr if sel8 == -9999 else sel8
    if std <= 0:
        return "評価基準値が無効"
    if prop == 1:
        v = mw / (22.41 * 298.15 / 273.15) * std * 0.75 * 10
    elif prop == 2:
        v = std * 0.75 * 10
    else:
        return "無効な物性値または分子量"
    v = round_sig_down(v, 3)
    return v


def calculate_exposure_bands(ptype, vol, short_effect, conc, amount, spray, venti, area, ftype, freq, hours, varc, apf):
    init = 0
    if ptype == 1:
        table = {1: {1: 5000, 2: 500, 3: 50, 4: 50, 5: 5},
                 2: {1: 500, 2: 500, 3: 50, 4: 5, 5: 5},
                 3: {1: 50, 2: 50, 3: 5, 4: 5, 5: 0.5},
                 4: {1: 5, 2: 5, 3: 0.5, 4: 0.5, 5: 0.05}}
        init = table.get(vol, {}).get(amount, 0)
    elif ptype == 2:
        table = {1: {1: 100, 2: 10, 3: 1, 4: 0.1, 5: 0.1},
                 2: {1: 100, 2: 10, 3: 0.1, 4: 0.1, 5: 0.1},
                 3: {1: 1, 2: 1, 3: 0.1, 4: 0.1, 5: 0.01}}
        init = table.get(vol, {}).get(amount, 0)
    if vol == 4 and venti > 1:
        venti = 1
    if short_effect == 1:
        tc = 1
    else:
        tc = 1  # VBA: 未設定時は 0 だが、ftype は 0/1 のみ
        if ftype == 1:
            if freq > 7:
                freq = 7
            if hours * freq > 40:
                tc = 10
            elif hours > 8 and freq >= 3:
                tc = 10
            elif hours * freq <= 4:
                tc = 0.1
            else:
                tc = 1
        elif ftype == 0:
            if freq > 31:
                freq = 0
            if hours * freq * 12 > 192:
                tc = 1
            else:
                tc = 0.1
    ep = init * conc * spray * area * venti * tc * apf
    ep = round_sig_down(ep, 2)
    if ptype == 1:
        if ep < 0.005:
            ep = 0.005
    elif ptype == 2:
        if ep < 0.001:
            ep = 0.001
    if vol == 4 and spray == 1:
        eps = ep
    else:
        eps = init * conc * spray * area * venti * varc * apf
    if ptype == 1:
        if eps < 0.005:
            eps = 0.005
    elif ptype == 2:
        if eps < 0.001:
            eps = 0.001
    eps = round_sig_down(eps, 2)
    if ep > 5000:
        ep = 5000
    if eps > 5000:
        eps = 5000
    return ep, eps


def risk_inh_8h(sel8, acr, ep):
    if sel8 > 0:
        std = sel8
    elif sel8 == -9999:
        std = acr
    else:
        return "", 0
    rcr = ep / std
    if rcr > 10:
        lv = "IV"
    elif rcr > 1:
        lv = "III"
    elif rcr > 0.5:
        lv = "II-B"
    elif rcr > 0.1:
        lv = "II-A"
    else:
        lv = "I"
    return lv, rcr


def risk_inh_short(selst, eps):
    if selst <= 0:
        return ""
    r = eps / selst
    if r > 10:
        return "IV"
    if r > 1:
        return "III"
    if r > 0.1:
        return "II"
    return "I"


def risk_dermal(oeld, da):
    if oeld <= 0 or da < 0:
        return "無効な入力値", 0
    r = da / oeld
    if r > 10:
        lv = "IV"
    elif r > 1:
        lv = "III"
    elif r > 0.1:
        lv = "II"
    else:
        lv = "I"
    return lv, r


def rl_num(lv):
    return {"IV": 4, "III": 3, "II-B": 2.5, "II-A": 2, "II": 2, "I": 1}.get(lv, 0)


def _clamp_level(t):
    if t >= 4:
        return 4
    if t == 3:
        return 3
    if t == 2:
        return 2
    return 1


def flam_gas(g, amount, ign, expl):
    if g == "-9999":
        return NA
    t = 0
    if g == "1":
        t = {1: 5, 2: 5, 3: 5, 4: 4, 5: 3}.get(amount, 0)
    elif g == "2":
        t = {1: 5, 2: 5, 3: 4, 4: 3, 5: 2}.get(amount, 0)
    if ign and expl:
        t -= 2
    elif ign or expl:
        t -= 1
    return _clamp_level(t)


def ox_gas(g, amount):
    if g == "-9999":
        return NA
    return _clamp_level({1: 5, 2: 4, 3: 3, 4: 2, 5: 2}.get(amount, 0))


def gases_under_pressure(g, amount):
    if g == "-9999":
        return NA
    return _clamp_level({1: 2, 2: 2, 3: 2, 4: 1, 5: 1}.get(amount, 0))


def flam_liq(g, fp, ptemp, amount, ign, expl):
    if not (g != "-9999" or fp != -9999):
        return NA
    if fp == -9999:
        if g in ("1", "2", "3"):
            fp = 23
        elif g == "4":
            fp = 60
    if ptemp > fp:
        g = "ProcessTemp>FlashPoint"
    if g == "ProcessTemp>FlashPoint":
        t = {1: 5, 2: 5, 3: 4, 4: 3, 5: 2}.get(amount, 0)
    elif g in ("1", "2"):
        t = {1: 5, 2: 5, 3: 4, 4: 3, 5: 2}.get(amount, 0)
    elif g == "3":
        t = {1: 4, 2: 3, 3: 2, 4: 2, 5: 2}.get(amount, 0)
    elif g == "4":
        t = {1: 3, 2: 2, 3: 2, 4: 2, 5: 1}.get(amount, 0)
    else:
        t = 0
    if ign and expl:
        t -= 2
    elif ign or expl:
        t -= 1
    return _clamp_level(t)


def flam_sol(g, amount, ign, expl, vol):
    if g == "-9999":
        return NA
    t = 0
    I = vb_bool_int(ign)
    E = vb_bool_int(expl)
    V = int(vol)
    if g == "1":
        t = {1: 5, 2: 5, 3: 4, 4: 3, 5: 2}.get(amount, 0)
        if ign and expl:
            t -= 2
        elif ign or expl:
            t -= 1
    elif g == "2":
        t = {1: 5, 2: 5, 3: 4, 4: 3, 5: 2}.get(amount, 0)
        if (I & E & V) != 0:
            t -= 3
        elif ((I & E) | (I & V) | (E & V)) != 0:
            t -= 2
        elif (I | E | V) != 0:
            t -= 1
    else:
        t = 0
    return _clamp_level(t)


def self_react(g, amount):
    if g == "-9999":
        return NA
    t = 0
    if g in ("A", "B", "C", "D", "E", "F"):
        t = 5
    elif g == "G":
        t = {1: 5, 2: 4, 3: 3, 4: 2, 5: 1}.get(amount, 0)
    return _clamp_level(t)


def self_heat(g, amount, contact):
    if g == "-9999":
        return NA
    t = {1: 5, 2: 4, 3: 3, 4: 2, 5: 2}.get(amount, 0)
    if contact:
        t -= 1
    return _clamp_level(t)


def water_react(g, amount, ign, contact):
    if g == "-9999":
        return NA
    if g == "1":
        t = 5
    elif g == "2":
        t = {1: 5, 2: 5, 3: 4, 4: 4, 5: 3}.get(amount, 0)
        if ign and contact:
            t -= 2
        elif ign or contact:
            t -= 1
    elif g == "3":
        t = {1: 5, 2: 4, 3: 3, 4: 3, 5: 2}.get(amount, 0)
        if ign and contact:
            t -= 2
        elif ign or contact:
            t -= 1
    else:
        t = 0
    return _clamp_level(t)


def ox_lsol(g, amount, organic):
    if g == "-9999":
        return NA
    if g == "1":
        t = {1: 5, 2: 4, 3: 3, 4: 2, 5: 2}.get(amount, 0)
    elif g == "2":
        t = {1: 4, 2: 3, 3: 2, 4: 2, 5: 2}.get(amount, 0)
    elif g == "3":
        t = {1: 3, 2: 2, 3: 2, 4: 2, 5: 1}.get(amount, 0)
    else:
        t = 0
    if organic:
        t -= 1
    return _clamp_level(t)


def org_perox(g, amount):
    return self_react(g, amount)


def fixed(g, level):
    return NA if g == "-9999" else level


# ---------------------------------------------------------------- CasSearch
GHS_KEYS = ["Explosives", "FlamGas", "Aerosol", "OxGas", "GasesUnderPressure", "FlamLiq", "FlamSol", "SelfReact",
            "PyrLiq", "PyrSol", "SelfHeat", "WaterReact", "OxLiq", "OxSol", "OrgPerox", "MetCorr", "InertExplosives",
            "AcuteToxOral", "AcuteToxDermal", "AcuteToxInhalationGases", "AcuteToxInhalationVapors",
            "AcuteToxInhalationDustOrMist", "SkinCorrOrIrrit", "EyeCorrOrIrrit", "RespSens", "SkinSens", "Muta",
            "Carc", "Repr", "STOTSE", "STOTRE", "AspTox"]

VOL_TEXT = {1: "High", 2: "Mid", 3: "Low", 4: "VeryLow"}


def convert_to_pa(v, unit):
    f = {"Pa": 1, "kPa": 1000, "hPa": 100, "mPa": 0.001, "mmHg": 133.3, "Torr": 133.3}.get(unit)
    if f is None:
        return 0.0
    return v * f


def convert_to_mgcm3(v, unit):
    f = {"mg/L": 0.001, "g/100mL": 10, "g/L": 1, "mg/mL": 1, "mg/cm3": 1}.get(unit)
    if f is None:
        raise ValueError("solubility unit")
    return v * f


def cas_search(cas, product_type):
    """CasSearch が RA シートの行へ書き込む内容（セル値）を返す。"""
    rec = substance_list().get(cas)
    if rec is None:
        return None
    chem = {j: vb_cstr(rec.get(str(j), "")) for j in range(1, 94)}
    cells = {}
    # GHS
    for k in range(6, 38):
        cells[k] = cell_parse(chem[k])  # idx k == RA sheet idx k
    vol = -9999
    try:
        ptype = float(chem[72]) if chem[72] != "" else None
        if ptype is None:
            raise ValueError
        ptype = int(ptype)
    except ValueError:
        ptype = -9999
    if ptype == 1 and chem[74] != "":
        bp_raw = cell_parse(chem[74])
        if isinstance(bp_raw, float):
            bp = cint(bp_raw)
            if bp < 50:
                vol = 1
            elif 50 <= bp <= 149:
                vol = 2
            elif bp >= 150:
                vol = 3
    if chem[79] != "":
        vp = convert_to_pa(float(cell_parse(chem[79])), chem[80])
    else:
        vp = 0.0
    if ptype == 1 and vp > 0 and vp < 0.5:
        vol = 4
    if product_type == 1 and ptype == 2 and vp >= 0.5:
        ptype = 1
        if vp > 25000:
            vol = 1
        elif 500 <= vp <= 25000:
            vol = 2
        elif vp < 500:
            vol = 3
    if ptype == 2:
        src = [45, 47, 51, 53, 58, 60, 62, 67, 69]
        unit = "mg/m3"
    else:
        src = [44, 46, 50, 52, 57, 59, 61, 66, 68]
        unit = "ppm"
    for n, j in enumerate(src):
        cells[38 + 2 * n] = cell_parse(chem[j])
        cells[39 + 2 * n] = unit
    cells[60] = 0.0
    for k in range(72, 81):
        cells[k - 11] = cell_parse(chem[k])
    k28 = None
    if vol != -9999:
        cells[70] = float(vol)
    if ptype == 1 and vol in VOL_TEXT:
        k28 = VOL_TEXT[vol]
    elif ptype == 3:
        k28 = "-"
    # Worksheet_Change（K28 へ書き込んだ際のイベント）
    if k28 is not None:
        cells[70] = float({"High": 1, "Mid": 2, "Low": 3, "VeryLow": 4}.get(k28, 0))
    return {"cells": cells, "k28": k28, "chem": chem}


def set_k28(row, choice):
    """利用者が揮発性／飛散性を選んだとき（Worksheet_Change）"""
    m = {"High": 1, "Mid": 2, "Unknown": 2, "Low": 3, "VeryLow": 4, "DustHigh": 1, "DustMid": 2, "DustLow": 3}
    row["k28"] = choice
    row["cells"][70] = float(m.get(choice, 0))


def regulation_info(row, content):
    chem = row.get("chem")
    if chem is None:
        return []
    conc = content if content is not None else 100
    g = lambda j: row["cells"].get(j)
    def gs(j):
        v = g(j)
        return "-9999" if v is None else vb_cstr(v)
    skin_flag = (gs(28) in ("1A", "1B", "1C", "1") or gs(29) == "1" or gs(30) in ("1", "1A", "1B") or gs(31) in ("1", "1A", "1B"))
    skin_cut = 1.0
    sc_cut = 1.0
    org_cut = 5
    try:
        skin_cut = float(chem[84]) if chem[84] != "" else 1.0
    except ValueError:
        pass
    try:
        sc_cut = float(chem[88]) if chem[88] != "" else 1.0
    except ValueError:
        pass
    out = []
    if chem[85] == "1" and conc > sc_cut: out.append("特化則（第１類物質）")
    if chem[86] == "1" and conc > sc_cut: out.append("特化則（第２類物質）")
    if chem[87] == "1" and conc > sc_cut: out.append("特化則（第３類物質）")
    if chem[89] == "1" and conc > org_cut: out.append("有機則（第１種有機溶剤）")
    if chem[90] == "1" and conc > org_cut: out.append("有機則（第２種有機溶剤）")
    if chem[91] == "1" and conc > org_cut: out.append("有機則（第３種有機溶剤）")
    if chem[92] == "1": out.append("鉛等")
    if chem[93] == "1": out.append("四アルキル鉛等")
    if (chem[81] == "1" or skin_flag) and conc >= skin_cut and chem[81] != "0" and chem[81] != "2":
        out.append("皮膚等障害化学物質")
    if chem[82] == "1": out.append("がん原性物質")
    if chem[83] == "1": out.append("濃度基準値設定物質")
    if chem[28] != "" or chem[29] != "" or chem[31] != "":
        out.append("リスクレベルS")
    return out


# ---------------------------------------------------------------- RunRAinRAsheet
Q4_VENT = {"A": 4, "B": 3, "C": 1, "D": 0.1, "E": 0.01, "F": 0.001}


def run_ra(product, rows):
    """product: dict（設問の回答）、rows: [{cells, k28, chem, content}]"""
    ppt = product["productType"]
    t_inh = product["targetInhalation"]; t_der = product["targetDermal"]; t_phy = product["targetPhysical"]
    # STEP3
    amount = product["amountLevel"]
    spray = 10 if product["spray"] else 1
    if ppt == 1:
        area = (10 if product.get("largeArea") else 1) if amount in (1, 2) else 1
    else:
        area = 1
    cv = bool(product.get("controlVelocity", False))
    venti = Q4_VENT[product["ventilation"]]
    if venti == 0.1 and not cv:
        venti = 0.5
    if venti == 0.01 and not cv:
        venti = 0.1
    hours = product["workingHours"]
    ftype = product["frequencyType"]
    freq = product["frequencyDays"]
    varc = product["exposureVariation"]
    apf = product.get("apfCoeff", 1)
    surface = product.get("contactArea", -99999)
    gt = product.get("gloveType", -99999)
    ge = product.get("gloveEducation", -99999)
    glove = gt * ge if gt == 0.2 else 1
    ptemp = product["processTemp"] if product.get("aboveRoomTemp") else 20
    ign = bool(product["ignitionRemoved"])
    expl = bool(product["explosiveAtmospherePrevented"])
    organic = not bool(product["organicNearby"])
    contact = not bool(product["airWaterContact"])

    results = []
    cs_long = cs_short = 0
    o_long = o_short = 0
    last_dermal = ""
    phys_texts = []
    for row in rows:
        cells = row["cells"]
        def G(j):
            v = cells.get(j)
            if v is None or v == "":
                return -9999
            return v
        def GS(j):
            return vb_cstr(G(j))
        ptype = int(G(61)) if isinstance(G(61), float) else G(61)
        vol = int(G(70)) if isinstance(G(70), float) else G(70)
        content = row["content"]
        conc = conc_coeff(content)
        mw = G(62); logkow = G(64); fp = G(65)
        if G(66) != -9999:
            sol = convert_to_mgcm3(G(66), GS(67))
        else:
            sol = -9999
        if G(68) != -9999:
            vp = convert_to_pa(G(68), GS(69))
        else:
            vp = 0.0
        g = {k: GS(6 + n) for n, k in enumerate(GHS_KEYS)}
        oel = [G(j) for j in range(38, 61)]
        short_effect = 1 if g["RespSens"] != "-9999" else 0
        res = {"inh8": "-", "inhShort": "-", "ep8": None, "epShort": None, "oel8": None, "oelShort": None,
               "acrMax": None, "oelDermal": None, "dermalAbs": None, "dermal": "-", "total": "-", "physical": "-",
               "physicalLevels": {}, "rcrInh": 0, "rcrDermal": 0, "unit": None, "propertyType": None, "volatility": None}
        rcr_inh = 0
        rcr_der = 0
        risk_long = ""
        risk_short = ""
        risk_der = ""
        if ppt == 1 and ptype == 2 and vp >= 0.5:
            ptype = 1
            if vp > 25000:
                vol = 1
            elif 500 <= vp <= 25000:
                vol = 2
            elif vp < 500:
                vol = 3
        unit = get_unit(ptype)
        res["unit"] = unit; res["propertyType"] = ptype; res["volatility"] = vol
        acr = sel8 = selst = None
        if t_inh or t_der:
            acr = calculate_acr_max(g, ptype)
            sel8 = select_oel_8h(ptype, oel[0], vb_cstr(oel[1]) if oel[1] != -9999 else "-9999", oel[4], _u(oel[5]), oel[8], _u(oel[9]), oel[14], _u(oel[15]), oel[18], _u(oel[19]), int(oel[22]) if oel[22] != -9999 else -9999)
            selst = select_oel_short(ptype, oel[2], _u(oel[3]), oel[6], _u(oel[7]), oel[10], _u(oel[11]), oel[12], _u(oel[13]), oel[16], _u(oel[17]), oel[20], _u(oel[21]), oel[0], _u(oel[1]), int(oel[22]) if oel[22] != -9999 else -9999, sel8, acr)
            res["acrMax"] = acr; res["oel8"] = sel8; res["oelShort"] = selst
        if t_inh and ptype != 3:
            if ppt == 2 and ptype == 1:
                pass
            else:
                thr = 5 if product.get("mode") == "report" else 0.5
                if ppt == 1 and ptype == 2 and vp < thr and spray == 1:
                    ep = 0; eps = 0
                else:
                    ep, eps = calculate_exposure_bands(ptype, vol, short_effect, conc, amount, spray, venti, area, ftype, freq, hours, varc, apf)
                res["ep8"] = ep; res["epShort"] = eps
                risk_long, rcr_inh = risk_inh_8h(sel8, acr, ep)
                res["inh8"] = risk_long
                if selst != -9999:
                    risk_short = risk_inh_short(selst, eps)
                    res["inhShort"] = risk_short
        if t_der and ptype != 3:
            if ppt == 2 and ptype == 1:
                pass
            else:
                oeld = calculate_oel_dermal(sel8, acr, ptype, mw)
                da = calculate_dermal_absorption(mw, vp, sol, logkow, ptype, hours, surface, glove)
                if da != -9999:
                    risk_der, rcr_der = risk_dermal(oeld, da)
                    res["oelDermal"] = oeld; res["dermalAbs"] = da; res["dermal"] = risk_der
        if t_inh and t_der and ptype != 3:
            if not (ppt == 2 and ptype == 1):
                tot = rcr_inh + rcr_der
                res["total"] = "IV" if tot > 10 else "III" if tot > 1 else "II" if tot > 0.1 else "I"
        res["rcrInh"] = rcr_inh; res["rcrDermal"] = rcr_der
        regs = regulation_info(row, content)
        res["regulations"] = regs
        if "濃度基準値設定物質" in regs:
            cs_long = max(cs_long, rl_num(risk_long)) if cs_long < rl_num(risk_long) else cs_long
            cs_short = rl_num(risk_short) if cs_short < rl_num(risk_short) else cs_short
        else:
            o_long = rl_num(risk_long) if o_long < rl_num(risk_long) else o_long
            o_short = rl_num(risk_short) if o_short < rl_num(risk_short) else o_short
        if t_phy:
            if ppt == 2 and ptype in (1, 3):
                pass
            else:
                lv = {
                    "explosives": fixed(g["Explosives"], 4),
                    "flamGas": flam_gas(g["FlamGas"], amount, ign, expl),
                    "aerosol": flam_gas(g["Aerosol"], amount, ign, expl),
                    "oxGas": ox_gas(g["OxGas"], amount),
                    "gasesUnderPressure": gases_under_pressure(g["GasesUnderPressure"], amount),
                    "flamLiq": flam_liq(g["FlamLiq"], fp, ptemp, amount, ign, expl),
                    "flamSol": flam_sol(g["FlamSol"], amount, ign, expl, vol),
                    "selfReact": self_react(g["SelfReact"], amount),
                    "pyrLiq": fixed(g["PyrLiq"], 4),
                    "pyrSol": fixed(g["PyrSol"], 4),
                    "selfHeat": self_heat(g["SelfHeat"], amount, contact),
                    "waterReact": water_react(g["WaterReact"], amount, ign, contact),
                    "oxLiq": ox_lsol(g["OxLiq"], amount, organic),
                    "oxSol": ox_lsol(g["OxSol"], amount, organic),
                    "orgPerox": org_perox(g["OrgPerox"], amount),
                    "metCorr": fixed(g["MetCorr"], 2),
                    "inertExplosives": fixed(g["InertExplosives"], 4),
                }
                mx = max(lv.values())
                for key in PHYS_ORDER:
                    d = phys_desc(key, lv[key])
                    if d:
                        phys_texts.append(d)
                res["physical"] = {4: "IV", 3: "III", 2: "II"}.get(mx, "I")
                res["physicalLevels"] = {k: v for k, v in lv.items() if v != NA}
        last_dermal = risk_der
        results.append(res)
    skin = any(any(x in ("皮膚等障害化学物質", "特化則（第１類物質）", "特化則（第２類物質）", "特化則（第３類物質）") for x in r["regulations"]) for r in results)
    return {"components": results, "health": health_desc(cs_long, cs_short, o_long, o_short, skin, last_dermal),
            "physicalTexts": dedup(phys_texts)}


def _u(v):
    return "-9999" if v == -9999 else vb_cstr(v)


def conc_coeff(v):
    if v == 0:
        return -9999
    if v >= 25:
        return 1
    if v >= 5:
        return 0.6
    if v >= 1:
        return 0.2
    return 0.1


DESC = json.load(open(os.path.join(WORK, "descs.json"), encoding="utf-8"))
PHYS_ORDER = ["explosives", "flamGas", "aerosol", "oxGas", "gasesUnderPressure", "flamLiq", "flamSol", "selfReact", "pyrLiq",
              "pyrSol", "selfHeat", "waterReact", "oxLiq", "oxSol", "orgPerox", "metCorr", "inertExplosives"]


def phys_desc(key, level):
    if level == NA:
        return ""
    single = {"explosives": "explosivesRiskDescription4", "gasesUnderPressure": "gasesUnderPressureRiskDescription",
              "pyrLiq": "pyrLiqRiskDescription", "pyrSol": "pyrSolRiskDescription", "metCorr": "metCorrRiskDescription",
              "inertExplosives": "inertExplosivesRiskDescription"}
    if key in single:
        return DESC[single[key]]
    base = "flamGas" if key == "aerosol" else key
    return DESC[f"{base}RiskDescription{level}"]


def dedup(items):
    out = []
    for x in items:
        if x and x not in out:
            out.append(x)
    return out


def health_desc(csl, css, ol, os_, skin, last_dermal):
    t = []
    m = {4: "4", 3: "3", 2.5: "2B", 2: "2A", 1: "1"}
    if csl in m: t.append(DESC["inhalationRiskDescriptionConcentrationStandard" + m[csl]])
    ms = {4: "4", 3: "3", 2: "2A", 1: "1"}
    if css in ms: t.append(DESC["inhalationRiskDescriptionConcentrationStandardShortTerm" + ms[css]])
    if ol in m: t.append(DESC["inhalationRiskDescription" + m[ol]])
    if os_ in (4, 3, 2): t.append(DESC["inhalationRiskDescriptionShortTerm" + ms[os_]])
    elif os_ == 1: t.append(DESC["inhalationRiskDescription1ShortTerm1"])
    if skin:
        t.append(DESC["skinRiskDescription"])
    else:
        dm = {"IV": "4", "III": "3", "II": "2", "I": "1"}
        if last_dermal in dm: t.append(DESC["dermalRiskDescription" + dm[last_dermal]])
    return dedup(t)


def manual_row(sub):
    """formChemicalInfo で手入力したのと同じセル（TS の CsSubstance 形式から）"""
    keys_ts = ["explosives", "flamGas", "aerosol", "oxGas", "gasesUnderPressure", "flamLiq", "flamSol", "selfReact",
               "pyrLiq", "pyrSol", "selfHeat", "waterReact", "oxLiq", "oxSol", "orgPerox", "metCorr", "inertExplosives",
               "acuteToxOral", "acuteToxDermal", "acuteToxInhalationGases", "acuteToxInhalationVapors",
               "acuteToxInhalationDustOrMist", "skinCorrOrIrrit", "eyeCorrOrIrrit", "respSens", "skinSens", "muta",
               "carc", "repr", "stotSe", "stotRe", "aspTox"]
    cells = {}
    for n, k in enumerate(keys_ts):
        v = sub["ghs"].get(k)
        cells[6 + n] = cell_parse(v) if v is not None else None
    order = ["cs8", "csShort", "jsoh", "jsohCeiling", "tlvTwa", "tlvStel", "tlvC", "mak", "makPeak", "other8", "otherShort"]
    for n, k in enumerate(order):
        o = sub["oel"].get(k)
        cells[38 + 2 * n] = float(o["value"]) if o else None
        cells[39 + 2 * n] = o["unit"] if o else None
    cells[60] = float(sub["oelSource"])
    cells[61] = float(sub["propertyType"]) if sub["propertyType"] is not None else None
    cells[62] = sub["molecularWeight"]
    cells[63] = sub["boilingPoint"]
    cells[64] = sub["logKow"]
    cells[65] = sub["flashPoint"]
    cells[66] = sub["solubility"]["value"] if sub["solubility"] else None
    cells[67] = sub["solubility"]["unit"] if sub["solubility"] else None
    cells[68] = sub["vaporPressure"]["value"] if sub["vaporPressure"] else None
    cells[69] = sub["vaporPressure"]["unit"] if sub["vaporPressure"] else None
    cells[70] = float(sub["volatility"]) if sub["volatility"] is not None else None
    for k in (62, 63, 64, 65, 66, 68):
        if cells[k] is not None:
            cells[k] = float(cells[k])
    return {"cells": cells, "k28": None, "chem": None}

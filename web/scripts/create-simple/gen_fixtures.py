"""
CREATE-SIMPLE ver3.2.1 一致検証データの生成。
oracle.py（公式 VBA の逐行移植。ROUNDDOWN/LOG は Excel 本体を COM で呼ぶ）で期待値を作り、
web/src/__fixtures__/create-simple/official-parity-cases.json に書き出す。

  python -I gen_fixtures.py <repo の substances.json> <出力 JSON>
"""
import itertools
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle as O  # noqa: E402

GHS_KEYS = ["explosives", "flamGas", "aerosol", "oxGas", "gasesUnderPressure", "flamLiq", "flamSol", "selfReact",
            "pyrLiq", "pyrSol", "selfHeat", "waterReact", "oxLiq", "oxSol", "orgPerox", "metCorr", "inertExplosives",
            "acuteToxOral", "acuteToxDermal", "acuteToxInhalationGases", "acuteToxInhalationVapors",
            "acuteToxInhalationDustOrMist", "skinCorrOrIrrit", "eyeCorrOrIrrit", "respSens", "skinSens", "muta",
            "carc", "repr", "stotSe", "stotRe", "aspTox"]
OEL_COLS = [44, 45, 46, 47, 50, 51, 52, 53, 57, 58, 59, 60, 61, 62, 66, 67, 68, 69]
KNOWN_SOL_UNITS = {"mg/L", "g/100mL", "g/L", "mg/mL", "mg/cm3"}


def compact_to_chem(rec):
    cas, name, en, ghs, oel, phys, reg = rec
    chem = {j: "" for j in range(1, 94)}
    chem[1] = cas
    chem[2] = name
    chem[3] = name
    chem[4] = en
    for n, k in enumerate(GHS_KEYS):
        chem[6 + n] = ghs.get(k, "")
    for n, j in enumerate(OEL_COLS):
        chem[j] = O.vb_cstr(oel[n]) if oel[n] is not None else ""
    for n, v in enumerate(phys):
        chem[72 + n] = O.vb_cstr(v) if v is not None else ""
    for n, v in enumerate(reg):
        chem[81 + n] = v
    return chem


def cas_search_compact(rec, product_type):
    """oracle.cas_search と同じ処理を、合成レコード（repo 形式）に対して行う"""
    chem = compact_to_chem(rec)
    raw = {str(j): chem[j] for j in range(1, 94)}
    lst = O.substance_list()
    key = "__synthetic__"
    lst[key] = raw
    try:
        row = O.cas_search(key, product_type)
    finally:
        del lst[key]
    return row


VOL_CHOICE = {1: "High", 2: "Mid", 3: "Low", 4: "VeryLow"}
DUST_CHOICE = {1: "DustHigh", 2: "DustMid", 3: "DustLow"}


def conditions_to_product(cond, targets, mode):
    resp = cond.get("respirator")
    apf = 1
    if mode == "report" and resp:
        f = resp["protectionFactor"]
        if f in (11, 20, 25):
            apf = 1 / f
        else:
            apf = 1 / f * {"none": 2, "sealCheck": 1.5, "fitTest": 1}[resp["fit"]]
    return dict(
        productType=cond["productType"], targetInhalation=targets["inhalation"], targetDermal=targets["dermal"],
        targetPhysical=targets["physical"], amountLevel=cond["amountLevel"], spray=cond["spray"],
        largeArea=cond["largeArea"], ventilation=cond["ventilation"], controlVelocity=cond["controlVelocityConfirmed"],
        workingHours=cond["workingHours"], frequencyType=1 if cond["frequencyType"] == "weekly" else 0,
        frequencyDays=cond["frequencyDays"], exposureVariation=6 if cond["exposureVariation"] == "large" else 4,
        contactArea=cond["contactArea"] if cond["contactArea"] is not None else -99999,
        gloveType={"none": 1, "noInfo": 1, "resistant": 0.2}[cond["glove"]],
        gloveEducation={"none": 1, "basic": 0.5, "thorough": 0.25}[cond["gloveTraining"]],
        aboveRoomTemp=cond["processTemperature"] is not None,
        processTemp=cond["processTemperature"] if cond["processTemperature"] is not None else 20,
        ignitionRemoved=cond["ignitionSourceRemoved"], explosiveAtmospherePrevented=cond["explosiveAtmospherePrevented"],
        organicNearby=cond["organicOrMetalNearby"], airWaterContact=cond["airOrWaterContact"], apfCoeff=apf, mode=mode,
    )


def build_rows(case):
    rows = []
    pt = case["conditions"]["productType"]
    for comp in case["components"]:
        if comp["kind"] == "official":
            row = O.cas_search(comp["cas"], pt)
        elif comp["kind"] == "record":
            row = cas_search_compact(comp["record"], pt)
        else:
            row = O.manual_row(comp["substance"])
        if comp.get("volatilityOverride") is not None:
            row["cells"][70] = float(comp["volatilityOverride"])
        row["content"] = comp["contentPercent"]
        rows.append(row)
    return rows


def expected_of(out):
    comps = []
    for r in out["components"]:
        sel8 = r["oel8"]
        comps.append({
            "propertyType": r["propertyType"] if r["propertyType"] != -9999 else None,
            "acrMax": r["acrMax"],
            "oel8h": None if sel8 in (None, -9999) else sel8,
            "oelShort": None if r["oelShort"] in (None, -9999) else r["oelShort"],
            "inh8": r["inh8"], "inhShort": r["inhShort"], "ep8": r["ep8"], "epShort": r["epShort"],
            "dermal": r["dermal"], "oelDermal": r["oelDermal"], "absorption": r["dermalAbs"],
            "total": r["total"], "physical": r["physical"], "byClass": r["physicalLevels"],
            "regulations": r["regulations"],
        })
    rev = {}
    for k, v in O.DESC.items():
        rev.setdefault(v, k)
    return {"components": comps, "health": [rev[t] for t in out["health"]], "physicalTexts": [rev[t] for t in out["physicalTexts"]]}


def base_conditions(**kw):
    c = dict(productType=1, amountLevel=3, spray=False, largeArea=False, ventilation="C", controlVelocityConfirmed=False,
             workingHours=4, frequencyType="weekly", frequencyDays=2, exposureVariation="small", contactArea=480,
             glove="none", gloveTraining="none", processTemperature=None, ignitionSourceRemoved=False,
             explosiveAtmospherePrevented=False, organicOrMetalNearby=True, airOrWaterContact=True, respirator=None)
    c.update(kw)
    return c


ALL = dict(inhalation=True, dermal=True, physical=True)


def manual(**kw):
    s = dict(name="合成物質", propertyType=1, volatility=3, ghs={}, oel={}, oelSource=0, molecularWeight=100.0,
             boilingPoint=None, logKow=1.0, flashPoint=None, solubility={"value": 10, "unit": "g/L"},
             vaporPressure={"value": 100, "unit": "Pa"}, regulatory=None)
    s.update(kw)
    return s


def rec(cas="SYN", name="合成", ghs=None, oel=None, phys=None, reg=None):
    o = [None] * 18
    for k, v in (oel or {}).items():
        o[k] = v
    p = [1, 100, 120, 1.0, None, 10, "g/L", 100, "Pa"]
    for k, v in (phys or {}).items():
        p[k] = v
    return [cas, name, "", ghs or {}, o, p, reg or [""] * 13]


def main(repo_json, dst):
    rnd = random.Random(20261108)
    repo = json.load(open(repo_json, encoding="utf-8"))
    records = repo["substances"]
    raw = O.substance_list()

    # 0) repo のデータが公式リストと同じ ChemData を再現するか（全件）
    mism = 0
    for r in records:
        chem_c = compact_to_chem(r)
        chem_r = {j: O.vb_cstr(raw[r[0]].get(str(j), "")) for j in range(1, 94)}
        for j in [1, 2] + list(range(6, 38)) + OEL_COLS + list(range(72, 94)):
            a, b = chem_c[j], chem_r[j]
            if a != b:
                pa, pb = O.cell_parse(a), O.cell_parse(b)
                if pa != pb:
                    mism += 1
                    print("DATA MISMATCH", r[0], j, repr(a), repr(b))
    print("data records", len(records), "mismatch", mism)

    cases = []

    def add(note, conditions, components, targets=ALL, mode="sheet"):
        cases.append(dict(id=f"c{len(cases) + 1:05d}", note=note, mode=mode, targets=targets,
                          conditions=conditions, components=components))

    # 1) 公式ツールに保存されていた計算例（結果一覧シート No.1）
    ex = base_conditions(amountLevel=3, ventilation="E", controlVelocityConfirmed=True, workingHours=4, frequencyDays=3,
                         contactArea=480, glove="noInfo", organicOrMetalNearby=False, airOrWaterContact=False)
    comps = [dict(kind="official", cas="98-00-0", contentPercent=90), dict(kind="official", cas="98-01-1", contentPercent=10)]
    add("公式計算例（結果一覧 No.1 現状）", ex, comps)
    add("公式計算例（結果一覧 No.1 対策後）", dict(ex, glove="resistant", gloveTraining="thorough"), comps)

    by_cas = {r[0]: r for r in records}

    def usable(r, dermal):
        ptype, sol, solu = r[5][0], r[5][5], r[5][6]
        if ptype is None:
            return False
        if dermal and sol is not None and solu not in KNOWN_SOL_UNITS:
            return False  # 公式ツールは単位を読めずにエラーで止まる
        return True

    def rand_conditions(pt):
        return base_conditions(
            productType=pt, amountLevel=rnd.randint(1, 5), spray=rnd.random() < 0.3, largeArea=rnd.random() < 0.3,
            ventilation=rnd.choice("ABCDEF"), controlVelocityConfirmed=rnd.random() < 0.5,
            workingHours=rnd.choice([10, 8, 7, 6, 5, 4, 3, 2, 1, 0.5]),
            frequencyType=rnd.choice(["weekly", "weekly", "monthly"]), frequencyDays=rnd.randint(1, 7),
            exposureVariation=rnd.choice(["small", "large"]),
            contactArea=rnd.choice([10, 240, 480, 960, 1500, 1980]), glove=rnd.choice(["none", "noInfo", "resistant"]),
            gloveTraining=rnd.choice(["none", "basic", "thorough"]),
            processTemperature=rnd.choice([None, None, 30, 60, 100, 150]),
            ignitionSourceRemoved=rnd.random() < 0.5, explosiveAtmospherePrevented=rnd.random() < 0.5,
            organicOrMetalNearby=rnd.random() < 0.5, airOrWaterContact=rnd.random() < 0.5)

    def official_comp(r, pt):
        comp = dict(kind="official", cas=r[0], contentPercent=rnd.choice([100, 90, 50, 25, 24.9, 10, 5, 4.9, 1, 0.5]))
        row = O.cas_search(r[0], pt)
        if row["cells"].get(70) is None:
            ptype = r[5][0]
            if ptype == 2 and not (pt == 1 and row["cells"].get(61) == 2 and False):
                comp["volatilityOverride"] = rnd.choice([1, 2, 3])
            else:
                comp["volatilityOverride"] = rnd.choice([1, 2, 3, 4])
        return comp

    # 2) 公式物質リストの実在物質 × ランダム条件（単成分）
    pool = [r for r in records if usable(r, True)]
    sample = rnd.sample(pool, 1200)
    for r in sample:
        pt = rnd.choice([1, 1, 2]) if r[5][0] != 3 else rnd.choice([1, 3])
        if r[5][0] == 2 and rnd.random() < 0.5:
            pt = 2
        cond = rand_conditions(pt)
        add(f"実在物質 {r[0]} {r[1][:20]}", cond, [official_comp(r, pt)])

    # 3) 混合物（2〜4成分）
    for _ in range(200):
        pt = rnd.choice([1, 2])
        n = rnd.randint(2, 4)
        rs = rnd.sample(pool, n)
        add("実在物質の混合物", rand_conditions(pt), [official_comp(r, pt) for r in rs])

    # 4) 性状が空欄の物質（危険性のみ判定）
    for r in rnd.sample([r for r in records if r[5][0] is None], 40):
        add(f"性状空欄 {r[0]} 危険性のみ", rand_conditions(1), [dict(kind="official", cas=r[0], contentPercent=100)],
            targets=dict(inhalation=False, dermal=False, physical=True))

    # 5) 境界値: リスクレベルの閾値（ばく露比 0.1 / 0.5 / 1 / 10 ちょうどと前後）
    #    液体・低揮発・少量・換気C・週8時間 → 8時間上限 5 ppm、短時間 20 ppm
    for oel in [0.5, 0.49999, 0.50001, 5, 4.9999, 5.0001, 10, 9.9999, 10.0001, 50, 49.999, 50.001, 0.05, 500]:
        add(f"境界 8h OEL={oel}", base_conditions(), [dict(kind="manual", contentPercent=100, substance=manual(oel={"jsoh": {"value": oel, "unit": "ppm"}}))])
    for st in [2, 1.9999, 2.0001, 20, 19.999, 20.001, 200, 199.99, 200.01]:
        add(f"境界 短時間 OEL={st}", base_conditions(), [dict(kind="manual", contentPercent=100, substance=manual(oel={"jsohCeiling": {"value": st, "unit": "ppm"}, "jsoh": {"value": 1000, "unit": "ppm"}}))])
    # 粉体
    for oel in [0.1, 0.0999, 0.1001, 1, 0.2, 0.01, 10]:
        add(f"境界 粉体 OEL={oel}", base_conditions(productType=2), [dict(kind="manual", contentPercent=100, substance=manual(propertyType=2, volatility=1, oel={"tlvTwa": {"value": oel, "unit": "mg/m3"}}))])

    # 6) 作業時間・頻度の補正の境界
    for hours, ftype, days in [(8, "weekly", 5), (10, "weekly", 4), (8, "weekly", 6), (10, "weekly", 3), (10, "weekly", 2),
                               (1, "weekly", 4), (0.5, "weekly", 8), (0.5, "weekly", 9), (2, "weekly", 3), (6, "weekly", 7),
                               (10, "weekly", 7), (4, "weekly", 1), (8, "monthly", 2), (8, "monthly", 3), (4, "monthly", 32),
                               (1, "monthly", 31), (1, "monthly", 16), (1, "monthly", 17), (10, "monthly", 1), (0.5, "monthly", 31)]:
        for resp in (False, True):
            ghs = {"respSens": "1"} if resp else {}
            add(f"時間補正 {hours}h {ftype} {days}日 感作性={resp}", base_conditions(workingHours=hours, frequencyType=ftype, frequencyDays=days),
                [dict(kind="manual", contentPercent=100, substance=manual(ghs=ghs, oel={"cs8": {"value": 2, "unit": "ppm"}}))])

    # 7) 換気・制御風速・揮発性・取扱量・スプレー・塗布面積の総当たり（液体）
    for vol, amount, vent, cv, spray, area in itertools.product([1, 2, 3, 4], [1, 2, 3, 4, 5], "ABCDEF", [False, True], [False, True], [False, True]):
        if vent not in "DE" and cv:
            continue
        if rnd.random() < 0.55:
            continue
        add(f"液体 総当たり vol{vol} amt{amount} {vent} cv{cv} spray{spray} area{area}",
            base_conditions(amountLevel=amount, ventilation=vent, controlVelocityConfirmed=cv, spray=spray, largeArea=area,
                            workingHours=8, frequencyDays=5, exposureVariation=rnd.choice(["small", "large"])),
            [dict(kind="manual", contentPercent=rnd.choice([100, 20, 3, 0.5]), substance=manual(volatility=vol, oel={"cs8": {"value": 1, "unit": "ppm"}}))])
    # 粉体
    for vol, amount, vent, spray in itertools.product([1, 2, 3], [1, 2, 3, 4, 5], "ABCDEF", [False, True]):
        add(f"粉体 総当たり vol{vol} amt{amount} {vent} spray{spray}",
            base_conditions(productType=2, amountLevel=amount, ventilation=vent, controlVelocityConfirmed=rnd.random() < .5,
                            spray=spray, workingHours=rnd.choice([10, 4, 0.5]), frequencyDays=rnd.randint(1, 7)),
            [dict(kind="manual", contentPercent=rnd.choice([100, 20, 3, 0.5]), substance=manual(propertyType=2, volatility=vol, oel={"cs8": {"value": 0.05, "unit": "mg/m3"}}))])

    # 8) 含有率の境界、最小値・最大値のクランプ
    for c in [100, 25, 24.999, 5, 4.999, 1, 0.999, 0.01]:
        add(f"含有率 {c}", base_conditions(), [dict(kind="manual", contentPercent=c, substance=manual())])
    add("最小値クランプ 液体", base_conditions(amountLevel=5, ventilation="F", workingHours=0.5, frequencyDays=1),
        [dict(kind="manual", contentPercent=0.5, substance=manual(volatility=4))])
    add("最小値クランプ 粉体", base_conditions(productType=2, amountLevel=5, ventilation="F", workingHours=0.5, frequencyDays=1),
        [dict(kind="manual", contentPercent=0.5, substance=manual(propertyType=2, volatility=3))])
    add("最大値クランプ", base_conditions(amountLevel=1, ventilation="A", spray=True, largeArea=True, workingHours=10, frequencyDays=7, exposureVariation="large"),
        [dict(kind="manual", contentPercent=100, substance=manual(volatility=1))])

    # 9) 沸点・蒸気圧からの揮発性判定（CasSearch）と昇華性固体・溶液中の固体
    for bp in [49.4, 49.5, 49.6, 50, 50.5, 51.5, 148.5, 149.4, 149.5, 150, 150.5, -10, 300]:
        add(f"沸点 {bp}", base_conditions(), [dict(kind="record", contentPercent=100, record=rec(phys={2: bp, 7: None}))])
    for vp, unit in [(0.4999, "Pa"), (0.5, "Pa"), (0.0001, "kPa"), (0.003, "mmHg"), (0.004, "mmHg"), (0, "Pa"), (0.3, "mPa"), (5, "hPa")]:
        add(f"液体 蒸気圧 {vp}{unit}", base_conditions(), [dict(kind="record", contentPercent=100, record=rec(phys={2: 200, 7: vp, 8: unit}))])
    for vp in [0.1, 0.4999, 0.5, 3, 4.99, 5, 499.9, 500, 25000, 25000.1, 30000]:
        for spray in (False, True):
            for mode in ("sheet", "report"):
                comp = dict(kind="record", contentPercent=30, record=rec(phys={0: 2, 2: None, 7: vp, 8: "Pa"}, oel={0: 1, 1: 0.5}))
                if not (vp >= 0.5):
                    comp["volatilityOverride"] = rnd.choice([1, 2, 3])
                cond = base_conditions(spray=spray)
                if mode == "report":
                    cond["respirator"] = {"protectionFactor": 10, "fit": "sealCheck"}
                add(f"溶液中の固体 VP={vp} spray={spray} {mode}", cond, [comp], mode=mode)
    # 粉体製品の中の液体成分・気体成分
    add("粉体製品中の液体成分", base_conditions(productType=2), [dict(kind="record", contentPercent=10, record=rec(ghs={"flamLiq": "2"}, phys={4: 10}))])
    add("液体製品中の気体成分", base_conditions(), [dict(kind="record", contentPercent=10, record=rec(ghs={"flamGas": "1", "gasesUnderPressure": "LiquefiedGas", "flamSol": "2"}, phys={0: 3}))])
    add("気体製品", base_conditions(productType=3), [dict(kind="record", contentPercent=100, record=rec(ghs={"flamGas": "2", "oxGas": "1"}, phys={0: 3}))])

    # 10) 管理目標濃度（GHS 区分から）
    acr_sets = [
        {}, {"acuteToxOral": "1"}, {"acuteToxOral": "1", "acuteToxInhalationGases": "4", "acuteToxInhalationVapors": "4", "acuteToxInhalationDustOrMist": "4"},
        {"acuteToxInhalationVapors": "1"}, {"muta": "1B"}, {"carc": "1A"}, {"acuteToxOral": "2"}, {"skinCorrOrIrrit": "1A"},
        {"respSens": "1"}, {"muta": "2"}, {"carc": "2"}, {"repr": "1B"}, {"stotRe": "1"}, {"acuteToxOral": "3"},
        {"skinCorrOrIrrit": "1B"}, {"skinCorrOrIrrit": "1"}, {"eyeCorrOrIrrit": "1"}, {"skinSens": "1A"}, {"repr": "2"},
        {"stotSe": "1"}, {"stotRe": "2"}, {"acuteToxOral": "4"}, {"skinCorrOrIrrit": "2"}, {"eyeCorrOrIrrit": "2"},
        {"eyeCorrOrIrrit": "2A"}, {"stotSe": "3"}, {"aspTox": "1"}, {"acuteToxDermal": "1"},
        {"acuteToxOral": "3", "acuteToxInhalationGases": "4", "acuteToxInhalationVapors": "4", "acuteToxInhalationDustOrMist": "4"},
    ]
    for g in acr_sets:
        for pt, vol in ((1, 2), (2, 1)):
            add(f"管理目標濃度 {g} pt{pt}", base_conditions(productType=pt), [dict(kind="manual", contentPercent=100, substance=manual(propertyType=pt, volatility=vol, ghs=g))])

    # 11) ばく露限界値の選定（優先順位・単位・3倍則）
    oel_sets = [
        ({"cs8": (2, "ppm"), "jsoh": (1, "ppm")}, 0), ({"cs8": (2, "ppm"), "jsoh": (1, "ppm")}, 2),
        ({"jsoh": (5, "ppm"), "tlvTwa": (3, "ppm"), "mak": (4, "ppm")}, 0), ({"tlvTwa": (3, "mg/m3"), "mak": (4, "ppm")}, 0),
        ({"tlvTwa": (3, "ppm"), "tlvStel": (9, "ppm"), "tlvC": (6, "ppm")}, 3), ({"tlvTwa": (3, "ppm"), "tlvC": (6, "ppm")}, 3),
        ({"mak": (10, "ppm"), "makPeak": (20, "ppm")}, 4), ({"other8": (7, "ppm"), "otherShort": (15, "ppm")}, 5),
        ({"other8": (7, "ppm")}, 0), ({"csShort": (3, "ppm")}, 0), ({"csShort": (3, "ppm"), "jsohCeiling": (1, "ppm")}, 0),
        ({"jsohCeiling": (2, "ppm"), "tlvStel": (1.5, "ppm")}, 0), ({}, 0), ({"cs8": (2, "mg/m3")}, 0),
        ({"jsoh": (5, "ppm")}, 3), ({"tlvTwa": (3, "ppm")}, 2), ({"cs8": (0.2, "ppm"), "csShort": (0.4, "ppm")}, 0),
    ]
    for oels, src in oel_sets:
        oel = {k: {"value": v, "unit": u} for k, (v, u) in oels.items()}
        add(f"OEL選定 {oels} src{src}", base_conditions(workingHours=8, frequencyDays=5), [dict(kind="manual", contentPercent=100, substance=manual(oel=oel, oelSource=src))])

    # 12) 経皮吸収
    for mw, logkow, sol, vp, pt in [(98.1, 0.28, (1000000, "mg/L"), (53, "Pa"), 1), (300, 4, (0.5, "mg/L"), (0.01, "Pa"), 1),
                                    (46, -0.3, (1000, "g/L"), (5800, "Pa"), 1), (150, 2, (2, "g/100mL"), None, 1),
                                    (400, 6, (0.001, "mg/mL"), (0.0001, "Pa"), 2), (60, 0, (0, "g/L"), (100, "Pa"), 1),
                                    (60, 0, (0, "g/L"), None, 1), (200, None, (10, "g/L"), (1, "Pa"), 1),
                                    (None, 1, (10, "g/L"), (1, "Pa"), 1), (120, 1, None, (1, "Pa"), 1), (90, 3, (5, "mg/cm3"), (2, "kPa"), 2),
                                    (500, 8, (1e-6, "mg/L"), (1e-7, "Pa"), 1), (30, -2, (500, "g/L"), (100000, "Pa"), 1)]:
        for area, glove, tr, hours in [(10, "none", "none", 0.5), (480, "resistant", "basic", 4), (1980, "resistant", "thorough", 10), (240, "noInfo", "thorough", 8)]:
            sub = manual(propertyType=pt, volatility=2 if pt == 1 else 1, molecularWeight=mw, logKow=logkow,
                         solubility={"value": sol[0], "unit": sol[1]} if sol else None,
                         vaporPressure={"value": vp[0], "unit": vp[1]} if vp else None,
                         oel={"cs8": {"value": 1, "unit": "ppm" if pt == 1 else "mg/m3"}})
            add(f"経皮 MW{mw} logKow{logkow} sol{sol} vp{vp} area{area} {glove}/{tr} {hours}h",
                base_conditions(productType=pt, contactArea=area, glove=glove, gloveTraining=tr, workingHours=hours), [dict(kind="manual", contentPercent=100, substance=sub)])
    # 接触面積が未回答のケースは公式ツールが判定を止める（期待値が存在しない）ため、ここには入れない

    # 13) 危険性（全クラス × 区分 × 取扱量 × 作業状況）
    phys_cats = {"explosives": ["1.1", "1.3", "UnstableExplosive"], "flamGas": ["1", "2"], "aerosol": ["1", "2", "3"], "oxGas": ["1"],
                 "gasesUnderPressure": ["CompressedGas", "LiquefiedGas"], "flamLiq": ["1", "2", "3", "4"], "flamSol": ["1", "2"],
                 "selfReact": ["A", "C", "G"], "pyrLiq": ["1"], "pyrSol": ["1"], "selfHeat": ["1", "2"], "waterReact": ["1", "2", "3"],
                 "oxLiq": ["1", "2", "3"], "oxSol": ["1", "2", "3"], "orgPerox": ["B", "F", "G"], "metCorr": ["1"], "inertExplosives": ["1"]}
    for cls, cats in phys_cats.items():
        for cat in cats:
            for amount in range(1, 6):
                for ign, expl, org, air in [(False, False, True, True), (True, False, False, True), (False, True, True, False), (True, True, False, False)]:
                    if rnd.random() < 0.4:
                        continue
                    pt = 2 if cls in ("flamSol", "pyrSol", "oxSol", "selfHeat") and rnd.random() < 0.5 else 1
                    vol = rnd.choice([1, 2, 3]) if pt == 2 else rnd.choice([1, 2, 3, 4])
                    add(f"危険性 {cls}={cat} amt{amount} ign{ign} expl{expl} org{org} air{air}",
                        base_conditions(productType=pt, amountLevel=amount, ignitionSourceRemoved=ign, explosiveAtmospherePrevented=expl,
                                        organicOrMetalNearby=org, airOrWaterContact=air),
                        [dict(kind="manual", contentPercent=100, substance=manual(propertyType=pt, volatility=vol, ghs={cls: cat}))],
                        targets=dict(inhalation=False, dermal=False, physical=True))
    # 引火点と取扱温度
    for cat, fp, temp in [(None, 40, None), (None, 40, 40), (None, 40, 41), ("3", None, None), ("3", None, 23), ("3", None, 24),
                          ("4", None, 60), ("4", None, 61), ("4", 80, 70), ("2", 10, None), ("4", 65, 66), ("3", 30, 25)]:
        for amount in (1, 3, 5):
            ghs = {"flamLiq": cat} if cat else {}
            add(f"引火性液体 cat{cat} fp{fp} temp{temp} amt{amount}", base_conditions(amountLevel=amount, processTemperature=temp),
                [dict(kind="manual", contentPercent=100, substance=manual(ghs=ghs, flashPoint=fp))], targets=dict(inhalation=False, dermal=False, physical=True))
    # 可燃性固体 区分2 の VBA ビット演算（揮発性 0 = 気体の「-」）
    for vol, pt in [(0, 3), (1, 2), (3, 2)]:
        for ign, expl in itertools.product([False, True], [False, True]):
            add(f"可燃性固体2 vol{vol} ign{ign} expl{expl}", base_conditions(productType=1 if pt == 3 else 2, amountLevel=2, ignitionSourceRemoved=ign, explosiveAtmospherePrevented=expl),
                [dict(kind="manual", contentPercent=100, substance=manual(propertyType=pt, volatility=vol, ghs={"flamSol": "2"}))], targets=dict(inhalation=False, dermal=False, physical=True))
    # 危険性の該当なし
    add("危険性 該当なし", base_conditions(), [dict(kind="manual", contentPercent=100, substance=manual())], targets=dict(inhalation=False, dermal=False, physical=True))

    # 14) 呼吸用保護具（実施レポートの補正）
    for factor in [4, 10, 11, 14, 19, 20, 25, 33, 50, 90, 1000]:
        for fit in ["fitTest", "sealCheck", "none"]:
            add(f"呼吸用保護具 {factor} {fit}", base_conditions(amountLevel=2, ventilation="B", workingHours=8, frequencyDays=5, respirator={"protectionFactor": factor, "fit": fit}),
                [dict(kind="manual", contentPercent=100, substance=manual(volatility=2, oel={"cs8": {"value": 1, "unit": "ppm"}}))], mode="report")

    # 15) 対象の組み合わせ
    for t in [dict(inhalation=True, dermal=False, physical=False), dict(inhalation=False, dermal=True, physical=False),
              dict(inhalation=True, dermal=True, physical=False), dict(inhalation=False, dermal=False, physical=True)]:
        for r in rnd.sample(pool, 15):
            pt = 1 if r[5][0] in (1, 3) else 2
            add(f"対象 {t} {r[0]}", rand_conditions(pt), [official_comp(r, pt)], targets=t)

    # 期待値の計算
    out_cases = []
    try:
        for i, case in enumerate(cases):
            rows = build_rows(case)
            product = conditions_to_product(case["conditions"], case["targets"], case["mode"])
            out = O.run_ra(product, rows)
            case["expected"] = expected_of(out)
            out_cases.append(case)
            if i % 500 == 0:
                print("...", i)
    finally:
        O.close_excel()

    n_comp = sum(len(c["components"]) for c in out_cases)
    payload = {
        "meta": {
            "generatedBy": "web/scripts/create-simple/gen_fixtures.py（oracle.py: 公式 VBA の逐行移植＋Excel COM の ROUNDDOWN/LOG）",
            "officialTool": "CREATE-SIMPLE ver3.2.1（CREATE-SIMPLE_ver3.2.1.xlsm, 厚生労働省 職場のあんぜんサイト）",
            "designDocument": "CREATE-SIMPLE の設計基準（2025年6月）",
            "cases": len(out_cases),
            "componentResults": n_comp,
        },
        "cases": out_cases,
    }
    with open(dst, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print("cases", len(out_cases), "component results", n_comp)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

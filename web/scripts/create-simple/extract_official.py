"""
公式 CREATE-SIMPLE_ver3.2.1.xlsm（厚生労働省 職場のあんぜんサイトで公開）から、検証用オラクルが使う
2つのファイルを作る。Excel のマクロは実行しない（openpyxl で値を読むだけ）。

  python -I extract_official.py <CREATE-SIMPLE_ver3.2.1.xlsm> <出力フォルダ>
    -> substance_list_raw.json（SubstanceList シートの全列）, descs.json（判定結果の文）

その後:
  set CREATE_SIMPLE_WORK=<出力フォルダ>
  python -I build_substances.py <xlsm> web/src/data/create-simple/substances.json
  python -I gen_fixtures.py web/src/data/create-simple/substances.json web/src/__fixtures__/create-simple/official-parity-cases.json
（gen_fixtures.py は ROUNDDOWN/LOG を Excel 本体の COM で計算するため、Excel がインストールされた Windows で実行する）
"""
import json
import os
import sys

import openpyxl


def main(src, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    wb = openpyxl.load_workbook(src, data_only=True, read_only=False)
    ws = wb["SubstanceList"]
    rows = []
    for r in ws.iter_rows(min_row=5, values_only=True):
        if r[0]:
            rows.append({str(j + 1): ("" if r[j] is None else r[j]) for j in range(0, 93)})
    json.dump(rows, open(os.path.join(out_dir, "substance_list_raw.json"), "w", encoding="utf-8"), ensure_ascii=False)
    tt = wb["TranslationTable"]
    descs = {}
    for name, d in wb.defined_names.items():
        if "Description" in name and name != "textResultDescription":
            cell = d.attr_text.split("!")[1].replace("$", "")
            descs[name] = tt[cell].value
    json.dump(descs, open(os.path.join(out_dir, "descs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(rows), len(descs))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

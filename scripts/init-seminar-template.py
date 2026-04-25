"""
ANZEN AI セミナーテンプレート (templates/seminar-template.pptx) を生成する。

このテンプレートは python-pptx 生成時の「ベース」として使い、
- 16:9 のスライドサイズ
- プロジェクトメタデータ（タイトル・作成者）
- 空白レイアウト
を含める。中身のスライドは生成スクリプト側で全て組み立てる。
"""
from pathlib import Path

from pptx import Presentation
from pptx.util import Inches

SLIDE_W_IN = 13.333
SLIDE_H_IN = 7.5

OUTPUT = Path(__file__).resolve().parents[1] / "templates" / "seminar-template.pptx"


def main() -> None:
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W_IN)
    prs.slide_height = Inches(SLIDE_H_IN)

    core = prs.core_properties
    core.title = "ANZEN AI Seminar Template"
    core.author = "ANZEN AI"
    core.company = "ANZEN AI"
    core.comments = (
        "労働安全コンサルタント（登録番号260022・土木）監修による"
        "労働衛生教育セミナー資料の共通テンプレート。"
    )
    core.subject = "労働衛生教育 16:9 テンプレート"
    core.keywords = "ANZEN AI; 労働安全; 労働衛生教育; PowerPoint"

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"[OK] Wrote template to {OUTPUT}")


if __name__ == "__main__":
    main()

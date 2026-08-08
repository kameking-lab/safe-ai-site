import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type ChemicalPpeSelectionBoundaryProps = {
  chemicalName?: string;
  sdsConfirmed?: boolean;
  suitabilityConfirmed?: boolean;
};

/**
 * 化学物質の同一性・SDS第8項・作業条件・製品仕様がそろうまで、
 * 具体的なPPE商品や購入リンクを表示しない共通fail-closed境界。
 */
export function ChemicalPpeSelectionBoundary({
  chemicalName,
  sdsConfirmed = false,
  suitabilityConfirmed = false,
}: ChemicalPpeSelectionBoundaryProps) {
  return (
    <details className="mt-4 rounded-xl border border-slate-300 bg-white px-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-slate-900">
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        保護具を選ぶ前に確認
      </summary>
      <div className="border-t border-slate-200 pb-3">
      <p className="mt-3 text-xs leading-6 text-slate-800">
        {chemicalName ? `${chemicalName}について、` : ""}
        SDS第8項と製品仕様が一致するまで、商品候補は表示しません。
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
          <dt className="font-bold text-slate-900">製品固有SDS</dt>
          <dd className="mt-1 text-slate-700">
            {sdsConfirmed ? "確認済みと記録されています（版・発行日も再確認）" : "未確認または不明"}
          </dd>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
          <dt className="font-bold text-slate-900">PPE適合性</dt>
          <dd className="mt-1 text-slate-700">
            {suitabilityConfirmed ? "確認済みと記録されています（製品仕様を再確認）" : "未確認または不明"}
          </dd>
        </div>
      </dl>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-800">
        <li>SDS第8項と、使用製品・成分版・濃度・温度・作業時間・飛散状態の一致</li>
        <li>酸素濃度と有害物濃度を踏まえた呼吸用保護具の方式、吸収缶の種類・使用限度</li>
        <li>手袋材質の耐透過性・破過時間、保護眼鏡・保護衣の仕様</li>
        <li>顔面への適合、他の保護具との干渉、交換・廃棄手順</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/guides/chemical-ra-create-simple"
          className="inline-flex min-h-[44px] items-center rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white hover:bg-amber-950"
        >
          SDSと公式ツールの確認手順
        </Link>
        <Link
          href="/chemical-database"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100"
        >
          公式出典を探す
        </Link>
      </div>
      </div>
    </details>
  );
}

import { NextResponse } from "next/server";
import { EQUIPMENT_CATALOG_QUARANTINE } from "@/lib/equipment-catalog-quarantine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 商品レコードの一次資料確認が完了するまで fail-closed。
 * 未検証レコードや件数をAPI利用者へ返さない。
 */
export async function GET() {
  return NextResponse.json(
    {
      status: EQUIPMENT_CATALOG_QUARANTINE.status,
      reasonCode: EQUIPMENT_CATALOG_QUARANTINE.reasonCode,
      message: EQUIPMENT_CATALOG_QUARANTINE.note,
      totalCandidates: 0,
      top: [],
      others: [],
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
        "X-Data-Status": "quarantined",
      },
    },
  );
}

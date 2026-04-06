import { NextResponse } from "next/server";
import { BEAR_SIGHTINGS_REAL, type BearSightingType } from "@/data/bear-sightings-real";

// 1時間キャッシュ
export const revalidate = 3600;

// 将来的に秋田県CKAN APIからフェッチする実装例:
// const AKITA_CKAN_API =
//   "https://ckan.pref.akita.lg.jp/api/3/action/datastore_search?resource_id=0678f9b3-4bf7-4212-9c0e-c0cb9b09b3cf&limit=1000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prefecture = searchParams.get("prefecture");
  const month = searchParams.get("month"); // "1"〜"12"
  const type = searchParams.get("type"); // "目撃"|"被害"|"捕獲"|"痕跡"

  let data = BEAR_SIGHTINGS_REAL;

  if (prefecture) {
    data = data.filter((s) => s.prefecture === prefecture);
  }
  if (month) {
    const m = parseInt(month, 10);
    data = data.filter((s) => new Date(s.date).getMonth() + 1 === m);
  }
  if (type) {
    data = data.filter((s) => s.type === (type as BearSightingType));
  }

  // GeoJSON形式で返す
  const geojson = {
    type: "FeatureCollection",
    features: data.map((s) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [s.lng, s.lat],
      },
      properties: {
        id: s.id,
        date: s.date,
        prefecture: s.prefecture,
        city: s.city,
        location: s.location,
        description: s.description,
        type: s.type,
        source: s.source,
      },
    })),
    meta: {
      total: data.length,
      updatedAt: new Date().toISOString(),
      sources: [
        {
          name: "富山県 クマっぷ（富山県環境政策課）",
          url: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html",
          license: "手動データ化",
        },
        {
          name: "秋田県 ツキノワグマ情報 / クマダス",
          url: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003",
          license: "CC BY 4.0",
        },
        {
          name: "石川県 ツキノワグマ目撃痕跡情報",
          url: "https://www.pref.ishikawa.lg.jp/sizen/kuma/r7mokugeki.html",
          license: "手動データ化",
        },
        {
          name: "長野県 けものおと2",
          url: "https://www.pref.nagano.lg.jp/shinrin/sangyo/ringyo/choju/joho/kuma-map.html",
          license: "手動データ化",
        },
        {
          name: "新潟県 にいがたクマ出没マップ",
          url: "https://www.pref.niigata.lg.jp/site/tyoujyutaisakusienn/1319666477308.html",
          license: "手動データ化",
        },
      ],
    },
  };

  return NextResponse.json(geojson);
}

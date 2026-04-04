/**
 * サイネージの地点（天気・気象庁市区町村コード）
 * 東京23区は気象庁の市区町村コード（130000.json 内の area.code）に対応
 */

export type SignageLocation = {
  id: string;
  /** 天気API・リスク表示名 */
  regionName: string;
  /** ドロップダウン表示 */
  label: string;
  latitude: number;
  longitude: number;
  /** Natural Earth GeoJSON の iso_3166_2（例 JP-13） */
  prefectureIso: string;
  /** 東京都などで細分区域を指定するとき（未使用なら undefined） */
  jmaCityCode?: string;
};

const TOKYO_WARDS: Omit<SignageLocation, "prefectureIso">[] = [
  { id: "tokyo-shinjuku", regionName: "東京都 新宿区", label: "東京都 新宿区", latitude: 35.6938, longitude: 139.7034, jmaCityCode: "1310400" },
  { id: "tokyo-chiyoda", regionName: "東京都 千代田区", label: "東京都 千代田区", latitude: 35.694, longitude: 139.7536, jmaCityCode: "1310100" },
  { id: "tokyo-chuo", regionName: "東京都 中央区", label: "東京都 中央区", latitude: 35.6706, longitude: 139.772, jmaCityCode: "1310200" },
  { id: "tokyo-minato", regionName: "東京都 港区", label: "東京都 港区", latitude: 35.6581, longitude: 139.7514, jmaCityCode: "1310300" },
  { id: "tokyo-bunkyo", regionName: "東京都 文京区", label: "東京都 文京区", latitude: 35.7081, longitude: 139.7522, jmaCityCode: "1310500" },
  { id: "tokyo-taito", regionName: "東京都 台東区", label: "東京都 台東区", latitude: 35.7126, longitude: 139.88, jmaCityCode: "1310600" },
  { id: "tokyo-sumida", regionName: "東京都 墨田区", label: "東京都 墨田区", latitude: 35.7107, longitude: 139.8015, jmaCityCode: "1310700" },
  { id: "tokyo-koto", regionName: "東京都 江東区", label: "東京都 江東区", latitude: 35.6738, longitude: 139.817, jmaCityCode: "1310800" },
  { id: "tokyo-shinagawa", regionName: "東京都 品川区", label: "東京都 品川区", latitude: 35.6094, longitude: 139.7303, jmaCityCode: "1310900" },
  { id: "tokyo-meguro", regionName: "東京都 目黒区", label: "東京都 目黒区", latitude: 35.6414, longitude: 139.6982, jmaCityCode: "1311000" },
  { id: "tokyo-ota", regionName: "東京都 大田区", label: "東京都 大田区", latitude: 35.5616, longitude: 139.7161, jmaCityCode: "1311100" },
  { id: "tokyo-setagaya", regionName: "東京都 世田谷区", label: "東京都 世田谷区", latitude: 35.6466, longitude: 139.6533, jmaCityCode: "1311200" },
  { id: "tokyo-shibuya", regionName: "東京都 渋谷区", label: "東京都 渋谷区", latitude: 35.6638, longitude: 139.6982, jmaCityCode: "1311300" },
  { id: "tokyo-nakano", regionName: "東京都 中野区", label: "東京都 中野区", latitude: 35.7074, longitude: 139.6638, jmaCityCode: "1311400" },
  { id: "tokyo-suginami", regionName: "東京都 杉並区", label: "東京都 杉並区", latitude: 35.6995, longitude: 139.6364, jmaCityCode: "1311500" },
  { id: "tokyo-toshima", regionName: "東京都 豊島区", label: "東京都 豊島区", latitude: 35.7264, longitude: 139.7156, jmaCityCode: "1311600" },
  { id: "tokyo-kita", regionName: "東京都 北区", label: "東京都 北区", latitude: 35.7536, longitude: 139.7334, jmaCityCode: "1311700" },
  { id: "tokyo-arakawa", regionName: "東京都 荒川区", label: "東京都 荒川区", latitude: 35.7364, longitude: 139.7834, jmaCityCode: "1311800" },
  { id: "tokyo-itabashi", regionName: "東京都 板橋区", label: "東京都 板橋区", latitude: 35.7512, longitude: 139.7092, jmaCityCode: "1311900" },
  { id: "tokyo-nerima", regionName: "東京都 練馬区", label: "東京都 練馬区", latitude: 35.7356, longitude: 139.6518, jmaCityCode: "1312000" },
  { id: "tokyo-adachi", regionName: "東京都 足立区", label: "東京都 足立区", latitude: 35.7756, longitude: 139.8045, jmaCityCode: "1312100" },
  { id: "tokyo-katsushika", regionName: "東京都 葛飾区", label: "東京都 葛飾区", latitude: 35.7434, longitude: 139.8472, jmaCityCode: "1312200" },
  { id: "tokyo-edogawa", regionName: "東京都 江戸川区", label: "東京都 江戸川区", latitude: 35.7068, longitude: 139.8683, jmaCityCode: "1312300" },
];

export const signageLocations: SignageLocation[] = [
  ...TOKYO_WARDS.map((w) => ({ ...w, prefectureIso: "JP-13" as const })),
  { id: "hokkaido-sapporo", regionName: "北海道 札幌市", label: "北海道 札幌市", latitude: 43.0618, longitude: 141.3545, prefectureIso: "JP-01" },
  { id: "miyagi-sendai", regionName: "宮城県 仙台市", label: "宮城県 仙台市", latitude: 38.2682, longitude: 140.8694, prefectureIso: "JP-04" },
  { id: "aichi-nagoya", regionName: "愛知県 名古屋市", label: "愛知県 名古屋市", latitude: 35.1815, longitude: 136.9066, prefectureIso: "JP-23" },
  { id: "osaka-osaka", regionName: "大阪府 大阪市", label: "大阪府 大阪市", latitude: 34.6937, longitude: 135.5023, prefectureIso: "JP-27" },
  { id: "hiroshima-hiroshima", regionName: "広島県 広島市", label: "広島県 広島市", latitude: 34.3853, longitude: 132.4553, prefectureIso: "JP-34" },
  { id: "kagawa-takamatsu", regionName: "香川県 高松市", label: "香川県 高松市", latitude: 34.3403, longitude: 134.0439, prefectureIso: "JP-37" },
  { id: "fukuoka-fukuoka", regionName: "福岡県 福岡市", label: "福岡県 福岡市", latitude: 33.5902, longitude: 130.4017, prefectureIso: "JP-40" },
];

export function getSignageLocationById(id: string): SignageLocation | undefined {
  return signageLocations.find((l) => l.id === id);
}

export function getSignageLocationByRegionName(name: string): SignageLocation | undefined {
  return signageLocations.find((l) => l.regionName === name);
}

/** 天気API用（既存サービスと同形） */
export const signageMeteoRegions = signageLocations.map((l) => ({
  regionName: l.regionName,
  latitude: l.latitude,
  longitude: l.longitude,
}));

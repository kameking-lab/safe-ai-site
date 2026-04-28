/**
 * 都道府県庁所在地（または県庁ベース）の代表座標。
 * 警報塗り分け・天気アイコン配置用のおおまかな中心点として使う。
 */

export type PrefectureCentroid = {
  iso: string;
  name: string;
  lat: number;
  lng: number;
};

export const PREFECTURE_CENTROIDS: PrefectureCentroid[] = [
  { iso: "JP-01", name: "北海道", lat: 43.0642, lng: 141.347 },
  { iso: "JP-02", name: "青森県", lat: 40.8244, lng: 140.74 },
  { iso: "JP-03", name: "岩手県", lat: 39.7036, lng: 141.1527 },
  { iso: "JP-04", name: "宮城県", lat: 38.2688, lng: 140.8721 },
  { iso: "JP-05", name: "秋田県", lat: 39.7186, lng: 140.1024 },
  { iso: "JP-06", name: "山形県", lat: 38.2404, lng: 140.3636 },
  { iso: "JP-07", name: "福島県", lat: 37.7503, lng: 140.4676 },
  { iso: "JP-08", name: "茨城県", lat: 36.3418, lng: 140.4468 },
  { iso: "JP-09", name: "栃木県", lat: 36.5658, lng: 139.8836 },
  { iso: "JP-10", name: "群馬県", lat: 36.3911, lng: 139.0608 },
  { iso: "JP-11", name: "埼玉県", lat: 35.857, lng: 139.6489 },
  { iso: "JP-12", name: "千葉県", lat: 35.6046, lng: 140.1233 },
  { iso: "JP-13", name: "東京都", lat: 35.6895, lng: 139.6917 },
  { iso: "JP-14", name: "神奈川県", lat: 35.4478, lng: 139.6425 },
  { iso: "JP-15", name: "新潟県", lat: 37.9024, lng: 139.0234 },
  { iso: "JP-16", name: "富山県", lat: 36.6953, lng: 137.2113 },
  { iso: "JP-17", name: "石川県", lat: 36.5947, lng: 136.6256 },
  { iso: "JP-18", name: "福井県", lat: 36.0652, lng: 136.2216 },
  { iso: "JP-19", name: "山梨県", lat: 35.6638, lng: 138.5683 },
  { iso: "JP-20", name: "長野県", lat: 36.6513, lng: 138.181 },
  { iso: "JP-21", name: "岐阜県", lat: 35.3912, lng: 136.7223 },
  { iso: "JP-22", name: "静岡県", lat: 34.9769, lng: 138.3831 },
  { iso: "JP-23", name: "愛知県", lat: 35.1815, lng: 136.9066 },
  { iso: "JP-24", name: "三重県", lat: 34.7303, lng: 136.5086 },
  { iso: "JP-25", name: "滋賀県", lat: 35.0045, lng: 135.8686 },
  { iso: "JP-26", name: "京都府", lat: 35.0212, lng: 135.7556 },
  { iso: "JP-27", name: "大阪府", lat: 34.6937, lng: 135.5023 },
  { iso: "JP-28", name: "兵庫県", lat: 34.6913, lng: 135.183 },
  { iso: "JP-29", name: "奈良県", lat: 34.6851, lng: 135.8048 },
  { iso: "JP-30", name: "和歌山県", lat: 34.226, lng: 135.1675 },
  { iso: "JP-31", name: "鳥取県", lat: 35.5039, lng: 134.2381 },
  { iso: "JP-32", name: "島根県", lat: 35.4723, lng: 133.0505 },
  { iso: "JP-33", name: "岡山県", lat: 34.6618, lng: 133.9344 },
  { iso: "JP-34", name: "広島県", lat: 34.3853, lng: 132.4553 },
  { iso: "JP-35", name: "山口県", lat: 34.186, lng: 131.4706 },
  { iso: "JP-36", name: "徳島県", lat: 34.0658, lng: 134.5593 },
  { iso: "JP-37", name: "香川県", lat: 34.3401, lng: 134.0434 },
  { iso: "JP-38", name: "愛媛県", lat: 33.8416, lng: 132.7657 },
  { iso: "JP-39", name: "高知県", lat: 33.5597, lng: 133.5311 },
  { iso: "JP-40", name: "福岡県", lat: 33.6064, lng: 130.4181 },
  { iso: "JP-41", name: "佐賀県", lat: 33.2494, lng: 130.2989 },
  { iso: "JP-42", name: "長崎県", lat: 32.7448, lng: 129.8737 },
  { iso: "JP-43", name: "熊本県", lat: 32.7898, lng: 130.7417 },
  { iso: "JP-44", name: "大分県", lat: 33.2382, lng: 131.6126 },
  { iso: "JP-45", name: "宮崎県", lat: 31.9111, lng: 131.4239 },
  { iso: "JP-46", name: "鹿児島県", lat: 31.5602, lng: 130.5581 },
  { iso: "JP-47", name: "沖縄県", lat: 26.2124, lng: 127.6809 },
];

export function centroidByIso(iso: string): PrefectureCentroid | undefined {
  return PREFECTURE_CENTROIDS.find((p) => p.iso === iso);
}

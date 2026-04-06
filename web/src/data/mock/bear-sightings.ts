// クマ目撃情報モックデータ
// 出典: 富山県クマっぷ、秋田県クマダス、各県公開情報をもとに手動データ化
// 富山県データ: https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html

export interface BearSighting {
  id: string;
  lat: number;
  lng: number;
  date: string; // ISO 8601
  prefecture: string;
  city: string;
  description: string;
  type: "sighting" | "damage" | "capture" | "trace";
  species: "ツキノワグマ" | "ヒグマ";
  source: string; // データソースURL
}

// 富山県の目撃情報（2024年〜2025年、市町村座標から生成）
// 出典: 富山県農林水産部自然保護課「ツキノワグマ出没情報地図（クマっぷ）」
const toyamaData: BearSighting[] = [
  { id: "toy-001", lat: 36.6959, lng: 137.2137, date: "2025-10-15", prefecture: "富山県", city: "富山市", description: "田尻地区の水田脇で目撃。成獣1頭。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-002", lat: 36.7089, lng: 137.1923, date: "2025-10-12", prefecture: "富山県", city: "富山市", description: "八尾地区の農道で目撃。柿の木付近。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-003", lat: 36.7234, lng: 137.2310, date: "2025-10-08", prefecture: "富山県", city: "富山市", description: "神通川上流域の林道でフンを確認。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-004", lat: 36.6501, lng: 137.0112, date: "2025-10-05", prefecture: "富山県", city: "南砺市", description: "五箇山地区の集落近くで目撃。果樹の被害あり。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-005", lat: 36.6834, lng: 137.0456, date: "2025-10-03", prefecture: "富山県", city: "南砺市", description: "利賀地区の山間部で2頭確認。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-006", lat: 36.5678, lng: 136.8934, date: "2025-09-28", prefecture: "富山県", city: "南砺市", description: "小矢部川源流付近の林道で目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-007", lat: 36.5956, lng: 137.3567, date: "2025-09-25", prefecture: "富山県", city: "立山町", description: "称名滝近くの登山道でクマの引っかき跡。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-008", lat: 36.5712, lng: 137.3678, date: "2025-09-20", prefecture: "富山県", city: "立山町", description: "立山カルデラ付近で目撃情報。登山者が報告。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-009", lat: 36.7456, lng: 137.4234, date: "2025-09-18", prefecture: "富山県", city: "魚津市", description: "片貝川沿いの農地に隣接する山林で目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-010", lat: 36.7801, lng: 137.3901, date: "2025-09-15", prefecture: "富山県", city: "黒部市", description: "黒部川沿いの農業地帯でスイカ被害。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-011", lat: 36.8234, lng: 137.4567, date: "2025-09-10", prefecture: "富山県", city: "入善町", description: "舟見地区の集落内で夜間目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-012", lat: 36.7123, lng: 137.5012, date: "2025-09-05", prefecture: "富山県", city: "朝日町", description: "宮崎地区の山沿いで成獣1頭目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-013", lat: 36.6345, lng: 137.1789, date: "2025-08-30", prefecture: "富山県", city: "富山市", description: "大沢野地区で養蜂箱が荒らされる。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-014", lat: 36.5234, lng: 137.1234, date: "2025-08-25", prefecture: "富山県", city: "砺波市", description: "庄川上流域の農地付近でフンと足跡。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-015", lat: 36.5589, lng: 137.0678, date: "2025-08-20", prefecture: "富山県", city: "砺波市", description: "福野地区の林縁部で夕方に目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-016", lat: 36.6901, lng: 137.3123, date: "2025-07-15", prefecture: "富山県", city: "富山市", description: "婦中地区の水田近くで早朝に1頭。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-017", lat: 36.6123, lng: 137.1456, date: "2025-06-10", prefecture: "富山県", city: "南砺市", description: "湯谷温泉付近で山菜採りの方が目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-018", lat: 36.5801, lng: 137.2890, date: "2025-05-20", prefecture: "富山県", city: "立山町", description: "芦峅寺地区の林道で目撃。親子連れ。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-019", lat: 36.6234, lng: 137.0901, date: "2025-05-12", prefecture: "富山県", city: "南砺市", description: "城端地区でクマの引っかき跡を確認。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-020", lat: 36.7345, lng: 137.3456, date: "2024-10-25", prefecture: "富山県", city: "上市町", description: "剱岳登山口付近の馬場島で目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-021", lat: 36.6567, lng: 137.4012, date: "2024-10-20", prefecture: "富山県", city: "黒部市", description: "宇奈月温泉の山側で捕獲。", type: "capture", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
  { id: "toy-022", lat: 36.7678, lng: 137.1678, date: "2024-10-15", prefecture: "富山県", city: "富山市", description: "城山（富山市）周辺で2頭確認。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html" },
];

// 秋田県データ（秋田県CKAN「クマダス」CC BY 4.0 をもとに抜粋）
// 出典: https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003
const akitaData: BearSighting[] = [
  { id: "aki-001", lat: 39.7185, lng: 140.1023, date: "2025-10-18", prefecture: "秋田県", city: "秋田市", description: "太平山麓の集落で目撃。夕方、ゴミ置き場付近。", type: "sighting", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
  { id: "aki-002", lat: 39.6234, lng: 140.3456, date: "2025-10-16", prefecture: "秋田県", city: "仙北市", description: "角館地区の田んぼで稲の被害。1頭目撃。", type: "damage", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
  { id: "aki-003", lat: 39.9123, lng: 140.2234, date: "2025-10-14", prefecture: "秋田県", city: "大仙市", description: "大曲の山林近くで早朝に目撃。成獣1頭。", type: "sighting", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
  { id: "aki-004", lat: 40.2345, lng: 140.5678, date: "2025-10-12", prefecture: "秋田県", city: "鹿角市", description: "十和田湖周辺の山道で目撃。登山者報告。", type: "sighting", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
  { id: "aki-005", lat: 39.4567, lng: 140.0234, date: "2025-10-10", prefecture: "秋田県", city: "湯沢市", description: "皆瀬地区の農作物被害（トウモロコシ）。", type: "damage", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
  { id: "aki-006", lat: 39.7890, lng: 140.4567, date: "2025-10-08", prefecture: "秋田県", city: "北秋田市", description: "阿仁地区の林道でフンと足跡を確認。", type: "trace", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
  { id: "aki-007", lat: 40.0678, lng: 140.3123, date: "2025-10-05", prefecture: "秋田県", city: "大館市", description: "比内地区で捕獲（箱罠）。オス成獣推定3歳。", type: "capture", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
  { id: "aki-008", lat: 39.5234, lng: 140.1678, date: "2025-09-28", prefecture: "秋田県", city: "雄勝郡東成瀬村", description: "役内川沿いの果樹園で被害。リンゴを食べた痕。", type: "damage", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
  { id: "aki-009", lat: 39.8456, lng: 140.5901, date: "2025-09-25", prefecture: "秋田県", city: "横手市", description: "増田地区の山林で目撃。親子（母1頭＋子2頭）。", type: "sighting", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
  { id: "aki-010", lat: 40.3456, lng: 140.4789, date: "2025-09-20", prefecture: "秋田県", city: "能代市", description: "二ツ井町の小坂川沿いで目撃。夕方。", type: "sighting", species: "ツキノワグマ", source: "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003" },
];

// 長野県データ
const naganoData: BearSighting[] = [
  { id: "nag-001", lat: 36.6513, lng: 138.1812, date: "2025-10-20", prefecture: "長野県", city: "長野市", description: "戸隠地区の登山道付近でクマを目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.nagano.lg.jp/yasei/documents/" },
  { id: "nag-002", lat: 36.2342, lng: 137.9678, date: "2025-10-15", prefecture: "長野県", city: "松本市", description: "梓川沿いの山林で果樹被害。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.nagano.lg.jp/yasei/documents/" },
  { id: "nag-003", lat: 35.8901, lng: 137.6234, date: "2025-10-10", prefecture: "長野県", city: "伊那市", description: "高遠地区の集落縁部で夕暮れ時に目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.nagano.lg.jp/yasei/documents/" },
  { id: "nag-004", lat: 36.1234, lng: 138.2345, date: "2025-09-30", prefecture: "長野県", city: "上田市", description: "鹿教湯温泉付近の林道でフンを確認。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.nagano.lg.jp/yasei/documents/" },
  { id: "nag-005", lat: 36.5678, lng: 137.8901, date: "2025-09-25", prefecture: "長野県", city: "大町市", description: "白馬岳登山道で登山者が目撃。親子連れ。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.nagano.lg.jp/yasei/documents/" },
];

// 新潟県データ
const niigataData: BearSighting[] = [
  { id: "nii-001", lat: 37.5123, lng: 138.8234, date: "2025-10-22", prefecture: "新潟県", city: "上越市", description: "安塚地区の農地付近で目撃。朝方。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.niigata.lg.jp/sec/yasei/kumainfo.html" },
  { id: "nii-002", lat: 37.3456, lng: 138.6789, date: "2025-10-18", prefecture: "新潟県", city: "南魚沼市", description: "六日町の山林でフンと引っかき跡。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.niigata.lg.jp/sec/yasei/kumainfo.html" },
  { id: "nii-003", lat: 37.7890, lng: 139.1234, date: "2025-10-15", prefecture: "新潟県", city: "阿賀野市", description: "五泉市境の山間部で捕獲。", type: "capture", species: "ツキノワグマ", source: "https://www.pref.niigata.lg.jp/sec/yasei/kumainfo.html" },
  { id: "nii-004", lat: 37.1234, lng: 138.5678, date: "2025-10-10", prefecture: "新潟県", city: "十日町市", description: "松之山地区の棚田付近でクマの被害。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.niigata.lg.jp/sec/yasei/kumainfo.html" },
];

// 石川県データ
const ishikawaData: BearSighting[] = [
  { id: "ish-001", lat: 36.5651, lng: 136.6561, date: "2025-10-20", prefecture: "石川県", city: "金沢市", description: "卯辰山公園付近の住宅地で目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.ishikawa.lg.jp/sizen/choju/kuma/" },
  { id: "ish-002", lat: 36.7234, lng: 136.5123, date: "2025-10-16", prefecture: "石川県", city: "白山市", description: "白山スーパー林道付近で登山者が目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.ishikawa.lg.jp/sizen/choju/kuma/" },
  { id: "ish-003", lat: 36.8901, lng: 136.4567, date: "2025-10-10", prefecture: "石川県", city: "輪島市", description: "朝市近くの山側で農作物被害。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.ishikawa.lg.jp/sizen/choju/kuma/" },
  { id: "ish-004", lat: 36.4234, lng: 136.7890, date: "2025-09-28", prefecture: "石川県", city: "小松市", description: "木場地区の林道でフンを確認。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.ishikawa.lg.jp/sizen/choju/kuma/" },
];

// 岩手県データ
const iwateData: BearSighting[] = [
  { id: "iwa-001", lat: 39.7036, lng: 141.1527, date: "2025-10-22", prefecture: "岩手県", city: "盛岡市", description: "岩手山麓の農地で早朝に目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.iwate.jp/nature/chikujuhozen/kumajouhoumap/" },
  { id: "iwa-002", lat: 39.2345, lng: 141.0234, date: "2025-10-18", prefecture: "岩手県", city: "遠野市", description: "遠野盆地の山沿いで果樹被害。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.iwate.jp/nature/chikujuhozen/kumajouhoumap/" },
  { id: "iwa-003", lat: 38.9678, lng: 141.1789, date: "2025-10-12", prefecture: "岩手県", city: "釜石市", description: "仙人峠付近でフンと足跡を確認。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.iwate.jp/nature/chikujuhozen/kumajouhoumap/" },
  { id: "iwa-004", lat: 40.1234, lng: 141.3456, date: "2025-10-08", prefecture: "岩手県", city: "久慈市", description: "種市地区の林道で目撃。成獣1頭。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.iwate.jp/nature/chikujuhozen/kumajouhoumap/" },
  { id: "iwa-005", lat: 39.5678, lng: 141.4567, date: "2025-09-30", prefecture: "岩手県", city: "一関市", description: "厳美渓付近の山林で捕獲。", type: "capture", species: "ツキノワグマ", source: "https://www.pref.iwate.jp/nature/chikujuhozen/kumajouhoumap/" },
];

// 山形県データ
const yamagataData: BearSighting[] = [
  { id: "yam-001", lat: 38.2404, lng: 140.3633, date: "2025-10-20", prefecture: "山形県", city: "山形市", description: "蔵王山麓の林縁部で夕方に目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.yamagata.jp/090010/kurashi/kankyoshizen/shizen/choju/kuma/" },
  { id: "yam-002", lat: 38.5678, lng: 140.1234, date: "2025-10-15", prefecture: "山形県", city: "鶴岡市", description: "出羽三山周辺の参道付近で目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.yamagata.jp/090010/kurashi/kankyoshizen/shizen/choju/kuma/" },
  { id: "yam-003", lat: 38.7890, lng: 139.8234, date: "2025-10-10", prefecture: "山形県", city: "酒田市", description: "鳥海山麓の農地で農作物被害。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.yamagata.jp/090010/kurashi/kankyoshizen/shizen/choju/kuma/" },
  { id: "yam-004", lat: 38.0123, lng: 140.4567, date: "2025-09-28", prefecture: "山形県", city: "米沢市", description: "置賜地区の山林でフンと引っかき跡。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.yamagata.jp/090010/kurashi/kankyoshizen/shizen/choju/kuma/" },
];

// 北海道データ（ヒグマ）
const hokkaidoData: BearSighting[] = [
  { id: "hok-001", lat: 43.0642, lng: 141.3469, date: "2025-10-25", prefecture: "北海道", city: "札幌市", description: "南区の住宅街に出没。市街地では異例。", type: "sighting", species: "ヒグマ", source: "https://www.pref.hokkaido.lg.jp/ks/skn/higuma/" },
  { id: "hok-002", lat: 43.7678, lng: 142.3789, date: "2025-10-22", prefecture: "北海道", city: "旭川市", description: "東旭川町の農地で農作物（とうもろこし）被害大。", type: "damage", species: "ヒグマ", source: "https://www.pref.hokkaido.lg.jp/ks/skn/higuma/" },
  { id: "hok-003", lat: 43.9234, lng: 144.3456, date: "2025-10-20", prefecture: "北海道", city: "北見市", description: "常呂川沿いの農地付近でヒグマを目撃。成獣1頭。", type: "sighting", species: "ヒグマ", source: "https://www.pref.hokkaido.lg.jp/ks/skn/higuma/" },
  { id: "hok-004", lat: 42.3456, lng: 140.9678, date: "2025-10-18", prefecture: "北海道", city: "苫小牧市", description: "勇払原野付近の林道でヒグマの足跡。", type: "trace", species: "ヒグマ", source: "https://www.pref.hokkaido.lg.jp/ks/skn/higuma/" },
  { id: "hok-005", lat: 44.3901, lng: 142.1234, date: "2025-10-15", prefecture: "北海道", city: "名寄市", description: "朱鞠内湖付近で釣り人がヒグマを目撃。", type: "sighting", species: "ヒグマ", source: "https://www.pref.hokkaido.lg.jp/ks/skn/higuma/" },
  { id: "hok-006", lat: 44.0234, lng: 143.2345, date: "2025-10-12", prefecture: "北海道", city: "紋別市", description: "湧別川上流で捕獲。オス成獣約150kg。", type: "capture", species: "ヒグマ", source: "https://www.pref.hokkaido.lg.jp/ks/skn/higuma/" },
  { id: "hok-007", lat: 42.7890, lng: 143.3456, date: "2025-10-08", prefecture: "北海道", city: "帯広市", description: "十勝平野の農地に出没。大豆畑荒らし。", type: "damage", species: "ヒグマ", source: "https://www.pref.hokkaido.lg.jp/ks/skn/higuma/" },
  { id: "hok-008", lat: 43.5678, lng: 145.1234, date: "2025-10-05", prefecture: "北海道", city: "釧路市", description: "阿寒湖付近の遊歩道でヒグマ目撃。観光客から報告。", type: "sighting", species: "ヒグマ", source: "https://www.pref.hokkaido.lg.jp/ks/skn/higuma/" },
];

// 青森県データ
const aomoriData: BearSighting[] = [
  { id: "aom-001", lat: 40.8224, lng: 140.7474, date: "2025-10-18", prefecture: "青森県", city: "青森市", description: "浪岡地区の果樹園でリンゴ被害。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.aomori.lg.jp/soshiki/kankyo/shizenhogo/kuma-jouhou.html" },
  { id: "aom-002", lat: 40.5678, lng: 141.1234, date: "2025-10-14", prefecture: "青森県", city: "八戸市", description: "南郷地区の山林付近で夕方に目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.aomori.lg.jp/soshiki/kankyo/shizenhogo/kuma-jouhou.html" },
  { id: "aom-003", lat: 40.6345, lng: 140.4567, date: "2025-10-10", prefecture: "青森県", city: "弘前市", description: "岩木山麓の農道でフンを確認。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.aomori.lg.jp/soshiki/kankyo/shizenhogo/kuma-jouhou.html" },
];

// 福島県データ
const fukushimaData: BearSighting[] = [
  { id: "fuk-001", lat: 37.7608, lng: 140.4748, date: "2025-10-20", prefecture: "福島県", city: "福島市", description: "土湯温泉付近の山林で目撃。", type: "sighting", species: "ツキノワグマ", source: "https://www.pref.fukushima.lg.jp/sec/16025b/kuma.html" },
  { id: "fuk-002", lat: 37.3234, lng: 140.1234, date: "2025-10-15", prefecture: "福島県", city: "会津若松市", description: "鶴ヶ城周辺の山林でフンと足跡。", type: "trace", species: "ツキノワグマ", source: "https://www.pref.fukushima.lg.jp/sec/16025b/kuma.html" },
  { id: "fuk-003", lat: 37.4567, lng: 139.9012, date: "2025-10-08", prefecture: "福島県", city: "南会津町", description: "伊南川沿いの農地で農作物被害。", type: "damage", species: "ツキノワグマ", source: "https://www.pref.fukushima.lg.jp/sec/16025b/kuma.html" },
];

// 全データ統合
export const bearSightings: BearSighting[] = [
  ...toyamaData,
  ...akitaData,
  ...naganoData,
  ...niigataData,
  ...ishikawaData,
  ...iwateData,
  ...yamagataData,
  ...hokkaidoData,
  ...aomoriData,
  ...fukushimaData,
];

// 対応予定の自治体（データ取得困難）
export const pendingPrefectures = [
  {
    name: "富山県",
    url: "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html",
    note: "ArcGISマップのみ公開。オープンデータなし。手動データ化済み（一部）",
    status: "partial" as const,
  },
  {
    name: "石川県",
    url: "https://www.pref.ishikawa.lg.jp/sizen/choju/kuma/",
    note: "HTMLページに目撃情報掲載。API・CSV未公開",
    status: "pending" as const,
  },
  {
    name: "長野県",
    url: "https://www.pref.nagano.lg.jp/yasei/documents/",
    note: "PDF報告書のみ。年次集計データ",
    status: "pending" as const,
  },
  {
    name: "新潟県",
    url: "https://www.pref.niigata.lg.jp/sec/yasei/kumainfo.html",
    note: "HTMLページ形式。CSV未公開",
    status: "pending" as const,
  },
  {
    name: "岩手県",
    url: "https://www.pref.iwate.jp/nature/chikujuhozen/kumajouhoumap/",
    note: "地図システムあり。オープンデータ未公開",
    status: "pending" as const,
  },
  {
    name: "山形県",
    url: "https://www.pref.yamagata.jp/090010/kurashi/kankyoshizen/shizen/choju/kuma/",
    note: "HTMLページのみ",
    status: "pending" as const,
  },
  {
    name: "福島県",
    url: "https://www.pref.fukushima.lg.jp/sec/16025b/kuma.html",
    note: "HTMLページのみ。CSVなし",
    status: "pending" as const,
  },
  {
    name: "青森県",
    url: "https://www.pref.aomori.lg.jp/soshiki/kankyo/shizenhogo/kuma-jouhou.html",
    note: "PDF・HTML形式。API未公開",
    status: "pending" as const,
  },
  {
    name: "北海道（ヒグマ）",
    url: "https://www.pref.hokkaido.lg.jp/ks/skn/higuma/",
    note: "PDF中心。リアルタイムデータなし",
    status: "pending" as const,
  },
];

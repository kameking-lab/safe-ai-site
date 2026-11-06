import byYear from '@/data/aggregates-mhlw/accidents-by-year.json';
import meta from '@/data/aggregates-mhlw/meta.json';
export function GET(){return Response.json({source:'厚生労働省 職場のあんぜんサイト',sourceUrl:'https://anzeninfo.mhlw.go.jp/anzen_pgm/SHISYO_FND.html',sourceUpdatedAt:meta.generatedAt,note:'収録事例の集計です。全国の災害発生総数や発生率ではありません。',years:Object.entries(byYear).map(([year,types])=>({year:Number(year),count:Object.values(types).reduce((a,b)=>a+b,0),types}))},{headers:{'Cache-Control':'public, max-age=3600'}});}

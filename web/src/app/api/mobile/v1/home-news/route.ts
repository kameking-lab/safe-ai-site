import { loadHomeLatestAccidentNews } from '@/lib/home/home-accident-server';
export async function GET(){return Response.json(await loadHomeLatestAccidentNews(),{headers:{'Cache-Control':'public, max-age=300'}});}

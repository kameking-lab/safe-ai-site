import { z } from 'zod';
import { weatherLocations,changeWeatherLocation } from '@/lib/mobile/weather-service';
import { member,json,failure } from '@/lib/mobile/http';
export async function GET(request:Request){try{return json(await weatherLocations(await member(request)));}catch(e){return failure(e);}}
async function change(request:Request){try{const userId=await member(request);const b=z.object({locationId:z.string().min(1).max(100)}).parse(await request.json());return json(await changeWeatherLocation(userId,request.method,b.locationId));}catch(e){return failure(e);}}
export {change as POST,change as DELETE,change as PATCH};

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { member,json,failure } from '@/lib/mobile/http';
export async function GET(request:Request){try{
  const userId=await member(request);const session=await auth();if(!prisma)throw new Error('FEATURE_UNAVAILABLE');
  const sdsHistory=await prisma.sdsSearch.findMany({where:{userId},orderBy:{createdAt:'desc'},take:10,select:{id:true,productName:true,riskLevel:true,createdAt:true}});
  return json({displayName:session?.user?.name??null,email:session?.user?.email??null,sdsHistory});
}catch(e){return failure(e);}}

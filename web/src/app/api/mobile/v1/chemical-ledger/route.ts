import { listChemicalRaLedger,type GovernanceSql } from '@/lib/chemical/ra-governance-repository';
import { prisma } from '@/lib/prisma';
import { requireCurrentOrganizationAccess } from '@/lib/server/organization-access';
import { member,json,failure } from '@/lib/mobile/http';
export async function GET(request:Request){try{await member(request);const access=await requireCurrentOrganizationAccess('viewer');if(!access.ok)return json({records:[],organizationName:null,unavailableReason:access.reason});if(!prisma)throw new Error('FEATURE_UNAVAILABLE');return json({records:await listChemicalRaLedger(prisma as unknown as GovernanceSql,access.organizationId,null),organizationName:access.organizationName,unavailableReason:null});}catch(e){return failure(e);}}

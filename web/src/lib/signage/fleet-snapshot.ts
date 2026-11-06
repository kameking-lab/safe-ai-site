import 'server-only';
import { prisma } from '@/lib/prisma';
import { requireOrganizationAccess } from '@/lib/server/organization-access';
import { listSignageFleet,type SignageFleetRow } from './fleet-repository';
import type { GovernanceSql } from '@/lib/chemical/ra-governance-repository';
export type SignageFleetSnapshot={
  records:Array<Omit<SignageFleetRow,'lastSeenAt'|'acknowledgedAt'>&{lastSeenAt:string|null;acknowledgedAt:string|null}>;
  organizationName:string|null;
  unavailable:'scope'|'authentication_not_configured'|'authentication_required'|'database_unavailable'|'membership_required'|'insufficient_role'|'fleet_unavailable'|null;
};
/** The website and native API use the same organization authorization and projection. */
export async function getSignageFleetSnapshot(organization:unknown):Promise<SignageFleetSnapshot>{
  const empty={records:[],organizationName:null};
  if(typeof organization!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(organization))return {...empty,unavailable:'scope'};
  const access=await requireOrganizationAccess(organization,'viewer');
  if(!access.ok)return {...empty,unavailable:access.reason};
  if(!prisma)return {...empty,unavailable:'database_unavailable'};
  try{
    const rows=await listSignageFleet(prisma as unknown as GovernanceSql,organization);
    return {organizationName:access.organizationName,unavailable:null,records:rows.map(row=>({...row,lastSeenAt:row.lastSeenAt?.toISOString()??null,acknowledgedAt:row.acknowledgedAt?.toISOString()??null}))};
  }catch{return {...empty,unavailable:'fleet_unavailable'};}
}

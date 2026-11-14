// All membership consumers share this boundary, including reads started before logout.
let generation = 0;
let loggingOut = 0;
export const memberGeneration = () => generation;
export const invalidateMemberReads = () => ++generation;
export function suspendMemberReads() {
  invalidateMemberReads();loggingOut++;
  return () => { loggingOut--;invalidateMemberReads(); };
}
export class StaleMemberResponseError extends Error {
  constructor() { super('STALE_MEMBER_RESPONSE'); }
}
export function assertCurrentMember(ticket: number) {
  if (loggingOut || ticket !== generation) throw new StaleMemberResponseError();
}
export async function currentMemberResponse<T>(ticket: number, work: Promise<T>): Promise<T> {
  try {
    const value = await work;
    assertCurrentMember(ticket);
    return value;
  } catch (error) {
    assertCurrentMember(ticket);
    throw error;
  }
}

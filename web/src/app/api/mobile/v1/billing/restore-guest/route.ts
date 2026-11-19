import { z } from 'zod';
import { restoreGuestStorePurchase } from '@/lib/mobile/guest-restore';
import { failure, json } from '@/lib/mobile/http';
import { mobileAuthSession } from '@/lib/mobile/session';

export const runtime = 'nodejs';
const receipt = z.object({ appUserId: z.string().min(16).max(200), signedTransaction: z.string().min(100).max(16384) });

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');
    const session = await mobileAuthSession();
    if (!session?.user.guest) throw new Error('UNAUTHORIZED');
    if (Number(request.headers.get('content-length') ?? 0) > 18000) throw new Error('INVALID_REQUEST');
    const body = receipt.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new Error('INVALID_REQUEST');
    return json(await restoreGuestStorePurchase(session.user.id, authorization.slice(7), body.data.appUserId, body.data.signedTransaction));
  } catch (error) {
    return failure(error);
  }
}

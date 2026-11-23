'use client';
import { useEffect, useState } from 'react';
import { billing } from '../lib/billing';

export function useStorePrice() {
  const [price, setPrice] = useState<string | null>(null);
  useEffect(() => {
    let generation = 0;
    const update = async () => {
      const ticket = ++generation;
      setPrice(null);
      try {
        const [config, member] = await Promise.all([
          billing.config(),
          billing.entitlement().catch(error => {
            if (error instanceof Error && error.message === 'UNAUTHORIZED') return null;
            throw error;
          }),
        ]);
        if (!config.ready || (member && (member.plan !== 'free' || member.syncState !== 'verified'))) return;
        const offer = member ? await billing.offering(config, member) : await billing.anonymousOffering(config);
        if (ticket === generation) setPrice(offer.product.priceString);
      } catch { /* StoreKit can be temporarily unavailable. The purchase action retries. */ }
    };
    void update();
    window.addEventListener('anzen-session-changed', update);
    return () => { generation++; window.removeEventListener('anzen-session-changed', update); };
  }, []);
  return price;
}

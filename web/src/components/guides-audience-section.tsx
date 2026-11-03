'use client';
import type { ReactNode } from 'react';
import { useNativeQuery } from '@/lib/use-native-query';
export function GuidesAudienceSection({initialNewWorker,children}:{initialNewWorker:boolean;children:ReactNode}){
  const query=useNativeQuery();
  return (query ? query.get('audience')==='new-worker' : initialNewWorker)?children:null;
}

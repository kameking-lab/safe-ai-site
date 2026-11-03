'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { selectDailyVisualKy } from '@/lib/visual-ky/daily';
export function DailyTraining(){const router=useRouter();useEffect(()=>{const daily=selectDailyVisualKy();router.replace(`/training/visual-ky/${daily.scenario.slug}/`);},[router]);return <p>日本時間の今日のKYTを選んでいます。</p>;}

'use client';
import { usePathname } from 'next/navigation';
import { SafetyNotice } from './safety-notice';
import { DisplaySettings } from './display-settings';
export function GlobalSupport(){const pathname=usePathname();return <div hidden={pathname==='/signage/display'}><SafetyNotice/><DisplaySettings/></div>;}

'use client';
import { DisplayPreferences } from './display-settings';
// Nothing stacked above every page: saved display choices apply everywhere. The switches live
// in 全機能 (rendered by SharedShell).
export function GlobalSupport(){
  return <><DisplayPreferences/></>;
}

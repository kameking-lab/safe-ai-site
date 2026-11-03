import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import type { Article } from './contracts';

export interface Store { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void>; remove(key: string): Promise<void> }
const native = () => Capacitor.isNativePlatform();
const pathFor = (key: string, slot: string) => `anzen/${key}-${slot}.json`;
const pointerKey = (key: string) => `anzen.file.${key}`;
export const contentStore: Store = {
  async get(key) {
    if (!native()) return localStorage.getItem(`anzen.content.${key}`);
    try {
      const slot = (await Preferences.get({ key: pointerKey(key) })).value === 'b' ? 'b' : 'a';
      const f = await Filesystem.readFile({ path: pathFor(key, slot), directory: Directory.LibraryNoCloud, encoding: Encoding.UTF8 });
      return String(f.data);
    }
    catch { return null; }
  },
  async set(key, value) {
    if (!native()) { localStorage.setItem(`anzen.content.${key}`, value); return; }
    // Write the inactive slot first. Disk-full/crash must not truncate the active snapshot.
    const current = (await Preferences.get({ key: pointerKey(key) })).value === 'b' ? 'b' : 'a';
    const next = current === 'a' ? 'b' : 'a';
    const options = { path: pathFor(key, next), directory: Directory.LibraryNoCloud, encoding: Encoding.UTF8 };
    await Filesystem.writeFile({ ...options, data: value, recursive: true });
    const written = await Filesystem.readFile(options);
    if (written.data !== value) throw new Error('端末への保存を確認できませんでした。');
    await Preferences.set({ key: pointerKey(key), value: next });
  },
  async remove(key) {
    if (!native()) { localStorage.removeItem(`anzen.content.${key}`); return; }
    for (const slot of ['a', 'b']) {
      try { await Filesystem.deleteFile({ path: pathFor(key, slot), directory: Directory.LibraryNoCloud }); }
      catch (error) { if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'OS-PLUG-FILE-0008')) throw error; }
    }
    await Preferences.remove({ key: pointerKey(key) });
  },
};
export const settingsStore: Store = {
  async get(key) { return (await Preferences.get({ key: `anzen.${key}` })).value; },
  async set(key, value) { await Preferences.set({ key: `anzen.${key}`, value }); },
  async remove(key) { await Preferences.remove({ key: `anzen.${key}` }); },
};
export function safeExternalUrl(value: string) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export async function openSource(value: string) {
  const url = safeExternalUrl(value); if (!url) throw new Error('安全な参照先ではありません。');
  if (native()) await Browser.open({ url });
  else window.open(url, '_blank', 'noopener,noreferrer');
}
export async function shareArticle(a: Article) {
  const url = safeExternalUrl(a.url); if (!url) throw new Error('共有先が不正です。');
  const text = `${a.title}\n${a.summary}\n出典: ${a.source}\n掲載日: ${a.date}\n${a.verification}`;
  if (native()) await Share.share({ title: a.title, text, url, dialogTitle: '出典付きで共有' });
  else if (navigator.share) await navigator.share({ title: a.title, text, url });
  else await navigator.clipboard.writeText(`${text}\n${url}`);
}

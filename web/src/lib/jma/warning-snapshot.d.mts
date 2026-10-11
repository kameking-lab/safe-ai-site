import type { JmaWarningPayload, JmaMapLevel } from './parse-jma-warning';
import type { JmaSourceIssue } from './jma-data';
export function warningLevel(code: string | undefined): Exclude<JmaMapLevel, 'none'> | null;
export function jmaWarningJsonCodesForIso2(iso: string): string[];
export function jmaWarningJsonUrl(code: string): string;
export function warningHttpIssue(headers: Pick<Headers, 'get'> | undefined, now?: Date): JmaSourceIssue | null;
export function inspectR8WarningSnapshot(value: unknown, now?: Date, sourceCode?: string): {ok: true; payload: JmaWarningPayload} | {ok: false; issue: 'schema-mismatch' | 'future-datetime' | 'abnormal-datetime'};

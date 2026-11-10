import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { nextBuildNumber } from '../scripts/next-build-number.mjs';

describe('App Store upload number', () => {
  it.each([['0', '11'], ['9', '11'], ['10', '11'], ['11', '12'], ['00012', '13'], ['9007199254740993', '9007199254740994']])('advances ASC %s with submitted build 10 as the floor', (latest, expected) => {
    expect(nextBuildNumber(latest)).toBe(expected);
  });
  it.each(['', ' ', '\n', '10\n', '-1', '1.0', 'NaN', 'unknown'])('rejects an invalid ASC response %j', latest => {
    expect(() => nextBuildNumber(latest)).toThrow('non-empty integer');
  });
  it('emits only the number for CM_ENV and stops on an empty response', () => {
    expect(execFileSync(process.execPath, ['scripts/next-build-number.mjs', '10'], { encoding: 'utf8' }).trim()).toBe('11');
    const invalid = spawnSync(process.execPath, ['scripts/next-build-number.mjs', ''], { encoding: 'utf8' });
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toBe('');
  });
});

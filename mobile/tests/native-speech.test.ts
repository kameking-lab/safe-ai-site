import { describe, expect, it, vi } from 'vitest';
vi.mock('@capacitor/core',()=>({Capacitor:{getPlatform:()=>'ios'},registerPlugin:()=>({})}));
import { speechErrorCode } from '../src/lib/native-speech';
describe('native speech error mapping',()=>{
  it('keeps the native reason distinguishable',()=>{
    expect(speechErrorCode('Speech permission denied')).toBe('not-allowed');
    expect(speechErrorCode('Microphone permission denied')).toBe('not-allowed');
    expect(speechErrorCode('On-device speech recognition unavailable')).toBe('language-not-supported');
    expect(speechErrorCode('Speech input unavailable')).toBe('audio-capture');
  });
});

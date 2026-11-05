import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';
import { sanitizePdfjsBrowserPath } from '../scripts/pdfjs-browser-path.mjs';
describe('iOS pipeline boundaries', () => {
  it('removes build-host paths only from PDF.js Node canvas fallback',()=>{
    const hostUrl='file:///'+['C:','Users','build-agent','node_modules','pdfjs-dist','pdf.mjs'].join('/');
    const source=`createWorker(new URL("pdf.worker.mjs",import.meta.url)); module.createRequire("${hostUrl}")("@napi-rs/canvas")`;
    const output=sanitizePdfjsBrowserPath(source);expect(output).not.toContain('build-agent');expect(output).toContain('file:///anzen-native/pdfjs.mjs');expect(output).toContain('new URL("pdf.worker.mjs",import.meta.url)');expect(sanitizePdfjsBrowserPath('other.createRequire("file:///data/document.mjs")')).toContain('file:///data/document.mjs');
  });
  it('bundles local screens and uploads without beta distribution or review submission', async () => {
    const config = await readFile(new URL('../capacitor.config.ts', import.meta.url), 'utf8');
    expect(config).not.toMatch(/\burl\s*:|allowNavigation|allowMixedContent/);
    const workflow = parse(await readFile(new URL('../../codemagic.yaml', import.meta.url), 'utf8')).workflows['anzen-ios-app-store'];
    expect(workflow.working_directory).toBe('mobile');
    expect(workflow.publishing.app_store_connect).toEqual({auth:'integration',submit_to_testflight:false,submit_to_app_store:false});
    expect(workflow.environment.ios_signing).toEqual({provisioning_profiles:['kakomon_appstore'],certificates:['kameking_distribution']});
    expect(workflow.triggering.events).toEqual(['push']);
    expect(workflow.when.changeset.includes).toContain('web/**');
    const scripts=workflow.scripts.map((step:{script:string})=>step.script).join('\n');
    expect(scripts).toContain('get-latest-testflight-build-number');
    expect(scripts).not.toContain('|| true');
    expect(scripts).toContain('ruby scripts/verify-ios.rb build/ios/export_options.plist');
    expect(scripts).toContain('--ipa-directory build/ios/ipa');
    expect(workflow.artifacts).toContain('mobile/build/ios/ipa/*.ipa');
    expect(scripts).not.toMatch(/CODE_SIGNING_ALLOWED=NO|vercel|git push/);
  });
  it('matches resource injection against the installed Capacitor template without generating iOS', () => {
    const template = execFileSync('tar', ['-xOf', 'node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz', 'App/App.xcodeproj/project.pbxproj'], { encoding: 'utf8' });
    expect(template).toMatch(/isa = PBXResourcesBuildPhase;\s*buildActionMask = \d+;\s*files = \(/);
    expect(template).toMatch(/\/\* App \*\/ = \{\s*isa = PBXGroup;\s*children = \(/);
    expect(template).toContain('MARKETING_VERSION = 1.0;');
  });
  it('routes cold starts to the matching bundled Next page and stores session credentials in Keychain',async()=>{
    const swift=await readFile(new URL('../ios-resources/NativeVault.swift',import.meta.url),'utf8');
    expect(swift).toContain('override func router() -> Router');expect(swift).toContain('candidate.appendingPathComponent("index.html")');expect(swift).toContain('candidate.path.hasPrefix(base.path + "/")');expect(swift).toContain('kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly');expect(swift).toContain('UIPrintInteractionController.shared');
  });
});

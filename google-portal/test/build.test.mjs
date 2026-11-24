import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { buildCode, buildManifest, PAGE_NAMES, SOURCE_ORDER, GP_DIR } from '../build.mjs';

const lf = (s) => s.replace(/\r\n/g, '\n');

describe('build', () => {
  it('lists sources in numeric order', () => {
    expect(SOURCE_ORDER[0]).toBe('00-config.js');
    expect([...SOURCE_ORDER].sort()).toEqual(SOURCE_ORDER);
  });

  it('dist/Code.gs and dist/appsscript.json are up to date (run npm run gp:build)', () => {
    expect(lf(readFileSync(join(GP_DIR, 'dist', 'Code.gs'), 'utf8'))).toBe(buildCode());
    expect(lf(readFileSync(join(GP_DIR, 'dist', 'appsscript.json'), 'utf8'))).toBe(buildManifest());
  });

  it('starts with the do-not-edit notice', () => {
    expect(buildCode().split('\n')[0]).toMatch(/GENERATED FILE/);
  });

  it('embeds one page per PAGE_NAMES with no build markers left', () => {
    const code = buildCode();
    expect(code).toContain('var GP_PAGES');
    const ctx = vm.createContext({});
    vm.runInContext(code, ctx);
    expect(Object.keys(ctx.GP_PAGES).sort()).toEqual([...PAGE_NAMES].sort());
    for (const name of PAGE_NAMES) {
      expect(ctx.GP_PAGES[name]).not.toContain('<!-- GP:');
    }
    expect(typeof ctx.GP_HUB_SECTIONS).toBe('string');
  });

  it('manifest is V8 with Drive v3 and an anonymous web app', () => {
    const m = JSON.parse(buildManifest());
    expect(m.runtimeVersion).toBe('V8');
    expect(m.dependencies.enabledAdvancedServices).toEqual([
      { userSymbol: 'Drive', serviceId: 'drive', version: 'v3' },
    ]);
    expect(m.webapp).toEqual({ executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' });
  });
});

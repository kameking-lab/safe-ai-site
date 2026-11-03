import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({ resolve:{alias:{'@':fileURLToPath(new URL('../web/src',import.meta.url)),'server-only':fileURLToPath(new URL('../web/src/test/server-only-mock.ts',import.meta.url))}},test: { include: ['tests/**/*.test.ts'], environment: 'node' } });

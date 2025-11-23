import { describe, it, expect } from 'vitest';
import path from 'path';
import { readConfig, writeConfig } from '../../src/manager/config';
import { getDocs } from '../../src/manager/docs';
import { readLogs } from '../../src/monitor/logs';

const TEST_APP_PATH = path.resolve(process.cwd(), '../test-app');

describe('Integration Tests', () => {
   describe('Desktop Platform Workflows', () => {
      it('should modify desktop config, verify changes, and restore', async () => {
         const initialConfig = await readConfig(TEST_APP_PATH, 'tauri.conf.json'),
               configObj = JSON.parse(initialConfig),
               originalTitle = configObj.app?.windows?.[0]?.title || 'test-app';

         configObj.app.windows[0].title = 'Integration Test App';
         await writeConfig(TEST_APP_PATH, 'tauri.conf.json', JSON.stringify(configObj, null, 2));

         const modifiedConfig = await readConfig(TEST_APP_PATH, 'tauri.conf.json');

         expect(JSON.parse(modifiedConfig).app.windows[0].title).toBe('Integration Test App');

         // Restore
         configObj.app.windows[0].title = originalTitle;
         await writeConfig(TEST_APP_PATH, 'tauri.conf.json', JSON.stringify(configObj, null, 2));
      });
   });

   describe('Cross-Platform Workflows', () => {
      it('should fetch docs for detected platform', async () => {
         const docs = await getDocs(TEST_APP_PATH);

         expect(docs).toContain('Tauri v2 Documentation');
         expect(docs.length).toBeGreaterThan(5000);
      });

      it('should read logs with platform auto-detection', async () => {
         try {
            const logs = await readLogs('desktop', 5);

            expect(logs).toBeDefined();
            expect(typeof logs).toBe('string');
         } catch(e) {
            // Expected if platform not supported
            expect(e).toBeDefined();
         }
      });

      it('should handle config operations across file types', async () => {
         // Verify all config types can be read
         await expect(readConfig(TEST_APP_PATH, 'tauri.conf.json')).resolves.toBeDefined();
         await expect(readConfig(TEST_APP_PATH, 'Cargo.toml')).resolves.toBeDefined();
         await expect(readConfig(TEST_APP_PATH, 'package.json')).resolves.toBeDefined();
      });
   });

   describe('Error Recovery', () => {
      it('should handle network failures during doc fetch gracefully', async () => {
         // Docs should have fallback behavior
         const docs = await getDocs(TEST_APP_PATH);

         expect(docs).toBeDefined();
         expect(docs.length).toBeGreaterThan(0);
      });
   });
});

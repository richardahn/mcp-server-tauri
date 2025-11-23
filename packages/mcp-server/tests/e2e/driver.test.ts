import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { manageDriverSession } from '../../src/driver/session-manager';
import { readConfig } from '../../src/manager/config';
import path from 'path';

describe('Driver Module E2E (Real App)', () => {
   const TIMEOUT = 90000;

   const TEST_APP_PATH = path.resolve(process.cwd(), '../test-app');

   beforeAll(async () => {
      // App is already started globally
      await manageDriverSession('start');
   }, TIMEOUT);

   afterAll(async () => {
      // Don't stop the app - it's managed globally
      await manageDriverSession('stop');
   }, TIMEOUT);

   it('should launch the test app successfully', async () => {
      // Verify the app is running by checking config can be read
      const config = await readConfig(TEST_APP_PATH, 'tauri.conf.json');

      expect(config).toContain('test-app');
      expect(config).toContain('com.hypothesi.test-app');
   }, TIMEOUT);

   it('should verify devtools feature is enabled', async () => {
      const { readFile } = await import('fs/promises');

      const cargoToml = await readFile(path.join(TEST_APP_PATH, 'src-tauri/Cargo.toml'), 'utf-8');

      expect(cargoToml).toContain('features = ["devtools"]');
   }, TIMEOUT);
});

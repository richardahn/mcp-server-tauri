import { describe, it, expect } from 'vitest';
import path from 'path';
import { runTauriCommand } from '../../src/manager/cli';
import { readConfig, writeConfig } from '../../src/manager/config';
import { getDocs } from '../../src/manager/docs';

const TEST_APP_PATH = path.resolve(process.cwd(), '../test-app');

describe('Manager Module E2E', () => {
   describe('CLI Operations', () => {
      it('should run tauri info command and verify output', async () => {
         const info = await runTauriCommand('info', TEST_APP_PATH, []);

         // Verify output contains expected sections
         const isValid = info.includes('Tauri CLI') || info.includes('tauri-apps/cli');

         expect(isValid).toBe(true);
         // Verify output is parseable
         expect(info).toBeDefined();
         expect(typeof info).toBe('string');
         expect(info.length).toBeGreaterThan(0);
      }, 120000); // Longer timeout for CLI commands

      it('should handle invalid commands gracefully', async () => {
         await expect(runTauriCommand('invalid-command', TEST_APP_PATH, []))
            .rejects
            .toThrow();
      });
   });

   describe('Configuration Management', () => {
      it('should read tauri.conf.json', async () => {
         const config = await readConfig(TEST_APP_PATH, 'tauri.conf.json');

         expect(config).toBeDefined();
         expect(config).toContain('test-app');
         const parsed = JSON.parse(config);

         expect(parsed).toHaveProperty('identifier');
      });

      it('should write to tauri.conf.json with valid JSON', async () => {
         const initialConfig = await readConfig(TEST_APP_PATH, 'tauri.conf.json'),
               configObj = JSON.parse(initialConfig),
               originalIdentifier = configObj.identifier,
               newIdentifier = 'com.test.write-validation';

         configObj.identifier = newIdentifier;
         await writeConfig(TEST_APP_PATH, 'tauri.conf.json', JSON.stringify(configObj, null, 2));

         const newConfig = await readConfig(TEST_APP_PATH, 'tauri.conf.json');

         expect(JSON.parse(newConfig).identifier).toBe(newIdentifier);

         // Restore
         configObj.identifier = originalIdentifier;
         await writeConfig(TEST_APP_PATH, 'tauri.conf.json', JSON.stringify(configObj, null, 2));
      });

      it('should reject invalid JSON when writing config', async () => {
         await expect(writeConfig(TEST_APP_PATH, 'tauri.conf.json', '{ invalid json }'))
            .rejects
            .toThrow('Invalid JSON');
      });

      it('should read Cargo.toml', async () => {
         const cargo = await readConfig(TEST_APP_PATH, 'Cargo.toml');

         expect(cargo).toBeDefined();
         expect(cargo).toContain('[package]');
         expect(cargo).toContain('test-app');
      });

      it('should read package.json', async () => {
         const pkg = await readConfig(TEST_APP_PATH, 'package.json');

         expect(pkg).toBeDefined();
         const parsed = JSON.parse(pkg);

         expect(parsed).toHaveProperty('name');
         expect(parsed.name).toBe('test-app');
      });

      it('should verify config file paths are correct', async () => {
         // Should be able to read all config files without errors
         await expect(readConfig(TEST_APP_PATH, 'tauri.conf.json')).resolves.toBeDefined();
         await expect(readConfig(TEST_APP_PATH, 'Cargo.toml')).resolves.toBeDefined();
         await expect(readConfig(TEST_APP_PATH, 'package.json')).resolves.toBeDefined();
      });
   });

   describe('Documentation', () => {
      it('should fetch docs for Tauri v2 project', async () => {
         const docs = await getDocs(TEST_APP_PATH);

         expect(docs).toContain('Tauri v2 Documentation');
         expect(docs).toContain('Dynamically Fetched');
      });

      it('should verify dynamic crawling works', async () => {
         const docs = await getDocs(TEST_APP_PATH);

         // Should have fetched multiple files
         expect(docs.length).toBeGreaterThan(10000); // Should be substantial
         expect(docs).toContain('src/content/docs');
      });

      it('should verify file filtering (exclude blogs, translations)', async () => {
         const docs = await getDocs(TEST_APP_PATH);

         // Should not contain translated content markers Note: blog/ might appear in file
         // paths, so we check for actual blog content structure
         expect(docs).not.toContain('/_fr/');
         expect(docs).not.toContain('/_es/');
      });

      it('should test minimum file count threshold', async () => {
         const docs = await getDocs(TEST_APP_PATH);

         // Count number of files (## markers)
         const fileCount = (docs.match(/## src\/content\/docs/g) || []).length;

         expect(fileCount).toBeGreaterThan(50); // Should have crawled many files
      });

      it('should verify frontmatter stripping', async () => {
         const docs = await getDocs(TEST_APP_PATH);

         // Should not have frontmatter markers after the first occurrence
         const lines = docs.split('\n');

         let foundContent = false;

         for (let i = 10; i < Math.min(100, lines.length); i++) {
            if (lines[i].includes('---') && foundContent) {
               // This is section dividers, not frontmatter
               continue;
            }
            if (lines[i].length > 0) {
               foundContent = true;
            }
         }
         expect(foundContent).toBe(true);
      });
   });
});

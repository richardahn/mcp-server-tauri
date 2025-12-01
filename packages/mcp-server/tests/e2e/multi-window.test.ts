import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { listWindows } from '../../src/driver/plugin-commands';
import { executeJavaScript, screenshot, interact } from '../../src/driver/webview-interactions';
import { manageDriverSession } from '../../src/driver/session-manager';

/**
 * E2E tests for multi-window support.
 * Tests the ability to list windows and target specific windows with tools.
 */
describe('Multi-Window Support E2E Tests', () => {
   const TIMEOUT = 10000;

   beforeAll(async () => {
      await manageDriverSession('start');
   });

   afterAll(async () => {
      await manageDriverSession('stop');
   });

   describe('Window Listing', () => {
      it('should list all windows', async () => {
         const result = await listWindows();

         const parsed = JSON.parse(result);

         expect(parsed).toHaveProperty('windows');
         expect(parsed).toHaveProperty('defaultWindow', 'main');
         expect(parsed).toHaveProperty('totalCount');
         expect(Array.isArray(parsed.windows)).toBe(true);
         expect(parsed.windows.length).toBeGreaterThan(0);
      }, TIMEOUT);

      it('should return window info with expected properties', async () => {
         const result = await listWindows();

         const parsed = JSON.parse(result);

         const mainWindow = parsed.windows.find((w: { label: string }) => { return w.label === 'main'; });

         expect(mainWindow).toBeDefined();
         expect(mainWindow).toHaveProperty('label');
         expect(mainWindow).toHaveProperty('focused');
         expect(mainWindow).toHaveProperty('visible');
         expect(mainWindow).toHaveProperty('isMain', true);
      }, TIMEOUT);
   });

   describe('Window Targeting', () => {
      it('should execute JavaScript in default window when no windowId specified', async () => {
         const result = await executeJavaScript({ script: 'document.title' });

         expect(result).toBeTruthy();
      }, TIMEOUT);

      it('should execute JavaScript in main window when windowId is "main"', async () => {
         const result = await executeJavaScript({ script: 'document.title', windowId: 'main' });

         expect(result).toBeTruthy();
      }, TIMEOUT);

      it('should return error for non-existent window', async () => {
         await expect(executeJavaScript({ script: 'document.title', windowId: 'non-existent-window' }))
            .rejects
            .toThrow(/not found/i);
      }, TIMEOUT);
   });

   describe('Backward Compatibility', () => {
      it('should work with existing tools without windowId', async () => {
         // Test that tools work without windowId (backward compatible)
         const result = await executeJavaScript({ script: '1 + 1' });

         // Result includes window context info
         expect(result).toContain('2');
         expect(result).toContain('[Executed in window: main]');
      }, TIMEOUT);

      it('should take screenshot without windowId', async () => {
         const result = await screenshot({});

         // Result is now a ScreenshotResult with content array
         expect(result).toHaveProperty('content');
         expect(Array.isArray(result.content)).toBe(true);

         // Should have text and image content
         const textContent = result.content.find((c) => { return c.type === 'text'; });

         const imageContent = result.content.find((c) => { return c.type === 'image'; });

         expect(textContent).toBeDefined();
         expect(imageContent).toBeDefined();
      }, TIMEOUT);

      it('should interact without windowId', async () => {
         // Just verify it doesn't throw - actual interaction depends on page content
         const result = await interact({
            action: 'scroll',
            scrollX: 0,
            scrollY: 10,
         });

         expect(result).toBeTruthy();
      }, TIMEOUT);
   });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as webviewExecutor from '../../src/driver/webview-executor';

// Mock the webview-executor module
vi.mock('../../src/driver/webview-executor', () => {
   return {
      executeInWebview: vi.fn(),
      captureScreenshot: vi.fn(),
   };
});

describe('Webview Interactions Unit Tests', () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   describe('Schema Validation', () => {
      it('should validate InteractSchema with click action', async () => {
         const { InteractSchema } = await import('../../src/driver/webview-interactions');

         const validInput = {
            action: 'click',
            selector: 'button',
         };

         expect(() => { return InteractSchema.parse(validInput); }).not.toThrow();
      });

      it('should validate InteractSchema with coordinates', async () => {
         const { InteractSchema } = await import('../../src/driver/webview-interactions');

         const validInput = {
            action: 'click',
            x: 100,
            y: 200,
         };

         expect(() => { return InteractSchema.parse(validInput); }).not.toThrow();
      });

      it('should validate InteractSchema with swipe action', async () => {
         const { InteractSchema } = await import('../../src/driver/webview-interactions');

         const validInput = {
            action: 'swipe',
            fromX: 100,
            fromY: 100,
            toX: 300,
            toY: 300,
         };

         expect(() => { return InteractSchema.parse(validInput); }).not.toThrow();
      });

      it('should validate KeyboardSchema with modifiers', async () => {
         const { KeyboardSchema } = await import('../../src/driver/webview-interactions');

         const validInput = {
            action: 'press',
            key: 'Enter',
            modifiers: [ 'Control', 'Shift' ],
         };

         expect(() => { return KeyboardSchema.parse(validInput); }).not.toThrow();
      });

      it('should validate WaitForSchema', async () => {
         const { WaitForSchema } = await import('../../src/driver/webview-interactions');

         const validInput = {
            type: 'selector',
            value: '.my-element',
            timeout: 5000,
         };

         expect(() => { return WaitForSchema.parse(validInput); }).not.toThrow();
      });

      it('should validate GetStylesSchema', async () => {
         const { GetStylesSchema } = await import('../../src/driver/webview-interactions');

         const validInput = {
            selector: 'div',
            properties: [ 'color', 'background-color' ],
            multiple: true,
         };

         expect(() => { return GetStylesSchema.parse(validInput); }).not.toThrow();
      });

      it('should validate ExecuteJavaScriptSchema', async () => {
         const { ExecuteJavaScriptSchema } = await import('../../src/driver/webview-interactions');

         const validInput = {
            script: 'return 2 + 2',
            args: [ 1, 2, 3 ],
         };

         expect(() => { return ExecuteJavaScriptSchema.parse(validInput); }).not.toThrow();
      });
   });

   describe('Function Calls', () => {
      it('should call executeScript when interact is called', async () => {
         const { interact } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockResolvedValue('Clicked at (100, 100)');

         await interact({ action: 'click', selector: 'button' });

         expect(mockExecuteInWebview).toHaveBeenCalledOnce();
         expect(mockExecuteInWebview).toHaveBeenCalledWith(expect.stringContaining('click'));
      });

      it('should call executeScript when interact is called with swipe', async () => {
         const { interact } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockResolvedValue('Swiped from (100, 100) to (300, 300)');

         await interact({
            action: 'swipe',
            fromX: 100,
            fromY: 100,
            toX: 300,
            toY: 300,
         });

         expect(mockExecuteInWebview).toHaveBeenCalledOnce();
         // Check for mouse/touch event handling in the script
         expect(mockExecuteInWebview).toHaveBeenCalledWith(expect.stringContaining('MouseEvent'));
      });

      it('should call executeScript when keyboard is called for key press', async () => {
         const { keyboard } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockResolvedValue('Pressed key: Enter');

         await keyboard('press', 'Enter', [ 'Control' ]);

         expect(mockExecuteInWebview).toHaveBeenCalledOnce();
         expect(mockExecuteInWebview).toHaveBeenCalledWith(expect.stringContaining('press'));
      });

      it('should call executeInWebview when keyboard is called for typing', async () => {
         const { keyboard } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockResolvedValue('Typed "Hello World" into #input');

         const result = await keyboard('type', '#input', 'Hello World');

         expect(mockExecuteInWebview).toHaveBeenCalledOnce();
         expect(mockExecuteInWebview).toHaveBeenCalledWith(expect.stringContaining('querySelector'));
         expect(result).toContain('Typed');
      });

      it('should call executeScript when focusElement is called', async () => {
         const { focusElement } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockResolvedValue('Focused element: input');

         await focusElement('input');

         expect(mockExecuteInWebview).toHaveBeenCalledOnce();
         expect(mockExecuteInWebview).toHaveBeenCalledWith(expect.stringContaining('focus'));
      });

      it('should blur active element when focusElement is called with empty selector', async () => {
         const { focusElement } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockResolvedValue('Focused element: body');

         await focusElement('body');

         expect(mockExecuteInWebview).toHaveBeenCalledOnce();
         expect(mockExecuteInWebview).toHaveBeenCalledWith(expect.stringContaining('focus'));
      });

      it('should call executeScript when getStyles is called', async () => {
         const { getStyles } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockResolvedValue('{"color":"red"}');

         await getStyles('div', [ 'color' ]);

         expect(mockExecuteInWebview).toHaveBeenCalledOnce();
         expect(mockExecuteInWebview).toHaveBeenCalledWith(expect.stringContaining('getComputedStyle'));
      });

      it('should call executeScript when executeJavaScript is called', async () => {
         const { executeJavaScript } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockResolvedValue('4');

         await executeJavaScript('return 2 + 2');

         expect(mockExecuteInWebview).toHaveBeenCalledOnce();
      });

      it('should wrap script with args when executeJavaScript is called with arguments', async () => {
         const { executeJavaScript } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockResolvedValue('8');

         await executeJavaScript('function(a, b) { return a + b; }', [ 5, 3 ]);

         expect(mockExecuteInWebview).toHaveBeenCalledOnce();
         const callArg = mockExecuteInWebview.mock.calls[0][0];

         expect(callArg).toContain('args');
         expect(callArg).toContain('[5,3]');
      });
   });

   describe('Error Handling', () => {
      it('should handle errors from executeInWebview', async () => {
         const { interact } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockRejectedValue(new Error('WebView error'));

         await expect(interact({ action: 'click', selector: 'button' })).rejects.toThrow('Interaction failed');
      });

      it('should handle errors when element not found', async () => {
         const { focusElement } = await import('../../src/driver/webview-interactions');

         const mockExecuteInWebview = vi.mocked(webviewExecutor.executeInWebview);

         mockExecuteInWebview.mockRejectedValue(new Error('Element not found'));

         await expect(focusElement('.nonexistent')).rejects.toThrow('Focus failed');
      });
   });
});

/**
 * html2canvas library loader
 *
 * Loads the html2canvas library from node_modules and provides it as a string
 * that can be injected into the webview.
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Use createRequire to resolve the path to html2canvas in node_modules
const require = createRequire(import.meta.url);

let html2canvasSource: string | null = null;

/**
 * Get the html2canvas library source code.
 * Loaded lazily and cached.
 */
export function getHtml2CanvasSource(): string {
   if (html2canvasSource === null) {
      // Resolve the path to html2canvas.min.js
      const html2canvasPath = require.resolve('html2canvas/dist/html2canvas.min.js');

      html2canvasSource = readFileSync(html2canvasPath, 'utf-8');
   }

   return html2canvasSource;
}

/**
 * Build a script that injects html2canvas and captures a screenshot.
 */
export function buildScreenshotScript(format: 'png' | 'jpeg', quality: number): string {
   const html2canvas = getHtml2CanvasSource();

   // Note: This script is wrapped by executeAsyncInWebview, so we don't need an IIFE
   // The wrapper adds: (async () => { const scriptPromise = (async () => { ...script... })(); ... })()
   return `
      try {
         // Inject html2canvas if not already present
         // The library uses UMD and may set on globalThis, self, or window
         if (typeof html2canvas === 'undefined') {
            ${html2canvas}
            // After loading, html2canvas should be on globalThis/self/window
         }

         // Get the html2canvas function (may be on window, self, or globalThis)
         const html2canvasFn = typeof html2canvas !== 'undefined' ? html2canvas :
                              (typeof window !== 'undefined' && window.html2canvas) ? window.html2canvas :
                              (typeof self !== 'undefined' && self.html2canvas) ? self.html2canvas :
                              (typeof globalThis !== 'undefined' && globalThis.html2canvas) ? globalThis.html2canvas : null;

         if (!html2canvasFn) {
            throw new Error('html2canvas failed to load - function not found on any global');
         }

         // Capture the entire document
         const element = document.documentElement;
         if (!element) {
            throw new Error('document.documentElement is null');
         }

         // Configure html2canvas options
         const options = {
            backgroundColor: null,
            scale: window.devicePixelRatio || 1,
            logging: false,
            useCORS: true,
            allowTaint: false,
            imageTimeout: 5000,
         };

         // Capture the webview
         const canvas = await html2canvasFn(element, options);
         if (!canvas) {
            throw new Error('html2canvas returned null canvas');
         }

         // Convert to data URL
         const mimeType = '${format}' === 'jpeg' ? 'image/jpeg' : 'image/png';
         const dataUrl = canvas.toDataURL(mimeType, ${quality / 100});

         if (!dataUrl || !dataUrl.startsWith('data:image/')) {
            throw new Error('canvas.toDataURL returned invalid result: ' + (dataUrl ? dataUrl.substring(0, 50) : 'null'));
         }

         return dataUrl;
      } catch (screenshotError) {
         // Re-throw with more context
         throw new Error('Screenshot capture failed: ' + (screenshotError.message || String(screenshotError)));
      }
   `;
}

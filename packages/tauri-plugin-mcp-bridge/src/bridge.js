// MCP Bridge: Enables eval() contexts to communicate with Tauri IPC
// This bridge is automatically injected by the mcp-bridge plugin
// It forwards DOM events from eval() contexts to Tauri IPC and back

(function() {
   'use strict';

   var origLog, origDebug, origInfo, origWarn, origError;

   // Initialize console capture so logs are captured from app startup
   function initConsoleCapture() {
      var args, message;

      if (window.__MCP_CONSOLE_LOGS__) {
         return; // Already initialized
      }

      origLog = console.log;
      origDebug = console.debug;
      origInfo = console.info;
      origWarn = console.warn;
      origError = console.error;

      window.__MCP_CONSOLE_LOGS__ = [];

      function captureLog(level, origFn) {
         return function() {
            args = Array.prototype.slice.call(arguments);

            try {
               message = args
                  .map(function(a) {
                     return typeof a === 'object' ? JSON.stringify(a) : String(a);
                  })
                  .join(' ');
            } catch(e) {
               message = args.map(String).join(' ');
            }

            window.__MCP_CONSOLE_LOGS__.push({
               level: level,
               message: message,
               timestamp: Date.now(),
            });

            origFn.apply(console, args);
         };
      }

      console.log = captureLog('log', origLog);
      console.debug = captureLog('debug', origDebug);
      console.info = captureLog('info', origInfo);
      console.warn = captureLog('warn', origWarn);
      console.error = captureLog('error', origError);

      console.log('[MCP Bridge] Console capture initialized');
   }

   // Wait for Tauri API to be available
   function waitForTauri(callback) {
      if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
         // eslint-disable-next-line callback-return
         callback();
      } else {
         setTimeout(function() {
            waitForTauri(callback);
         }, 50);
      }
   }

   waitForTauri(function() {
      console.log('[MCP Bridge] Tauri API available, initializing bridge');

      // Initialize console capture immediately so logs are captured from the start
      initConsoleCapture();

      // Listen for execution requests from eval() contexts
      window.addEventListener('__mcp_exec_request', async function(event) {
         const request = event.detail;

         console.log('[MCP Bridge] Received request:', request);

         try {
            // Forward to Tauri IPC using the global API
            const result = await window.__TAURI__.core.invoke(
               request.command,
               request.args
            );

            console.log('[MCP Bridge] Command succeeded, sending response');

            // Send success response back via DOM event
            window.dispatchEvent(new CustomEvent('__mcp_exec_response', {
               detail: {
                  execId: request.execId,
                  success: true,
                  data: result,
               },
            }));
         } catch(error) {
            console.error('[MCP Bridge] Command failed:', error);

            // Send error response back via DOM event
            window.dispatchEvent(new CustomEvent('__mcp_exec_response', {
               detail: {
                  execId: request.execId,
                  success: false,
                  error: error.message || String(error),
               },
            }));
         }
      });

      // Mark bridge as ready
      window.__MCP_BRIDGE_READY__ = true;
      console.log('[MCP Bridge] Ready');
   });
}());

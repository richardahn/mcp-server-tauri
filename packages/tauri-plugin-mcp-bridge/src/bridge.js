// MCP Bridge: Enables eval() contexts to communicate with Tauri IPC
// This bridge is automatically injected by the mcp-bridge plugin
// It forwards DOM events from eval() contexts to Tauri IPC and back

(function() {
   'use strict';

   var origLog, origDebug, origInfo, origWarn, origError, bridgeLogger;

   // MCP bridge logger - scoped with levels and tags
   function createMcpLogger(scope) {
      return {
         info: function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[MCP][' + scope + '][INFO]');
            console.log.apply(console, args);
         },
         warn: function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[MCP][' + scope + '][WARN]');
            console.warn.apply(console, args);
         },
         error: function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[MCP][' + scope + '][ERROR]');
            console.error.apply(console, args);
         },
         tag: function(tag, message) {
            console.error('[MCP][' + scope + '][' + tag + ']', message);
         },
      };
   }

   bridgeLogger = createMcpLogger('BRIDGE');

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

      bridgeLogger.info('Console capture initialized');
   }

   // Wait for Tauri API to be available
   function waitForTauri(callback) {
      if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
         callback();
      } else {
         setTimeout(function() {
            waitForTauri(callback);
         }, 50);
      }
   }

   waitForTauri(function() {
      bridgeLogger.info('Tauri API available, initializing bridge');

      // Initialize console capture immediately
      initConsoleCapture();

      // Capture unhandled JS errors and promise rejections
      if (!window.__MCP_UNHANDLED_ERRORS_CAPTURED__) {
         window.__MCP_UNHANDLED_ERRORS_CAPTURED__ = true;

         window.addEventListener('error', function(event) {
            var message, source, line;
            try {
               message = event.message || 'Unhandled error';
               source = event.filename ? ' at ' + event.filename : '';
               line = typeof event.lineno === 'number' ? ':' + event.lineno : '';
               bridgeLogger.tag('UNHANDLED_ERROR', message + source + line);
            } catch(e) {
               // Best-effort logging
            }
         });

         window.addEventListener('unhandledrejection', function(event) {
            var reason, reasonMessage;
            try {
               reason = event.reason;
               if (reason && typeof reason === 'object') {
                  if (reason instanceof Error && reason.message) {
                     reasonMessage = reason.message;
                  } else {
                     try {
                        reasonMessage = JSON.stringify(reason);
                     } catch(e) {
                        reasonMessage = String(reason);
                     }
                  }
               } else {
                  reasonMessage = String(reason);
               }
               bridgeLogger.tag('UNHANDLED_REJECTION', reasonMessage);
            } catch(e) {
               // Best-effort logging
            }
         });
      }

      // Listen for execution requests from eval() contexts
      window.addEventListener('__mcp_exec_request', async function(event) {
         const request = event.detail;
         bridgeLogger.info('Received request:', request);

         try {
            const result = await window.__TAURI__.core.invoke(
               request.command,
               request.args
            );
            bridgeLogger.info('Command succeeded, sending response');
            window.dispatchEvent(new CustomEvent('__mcp_exec_response', {
               detail: {
                  execId: request.execId,
                  success: true,
                  data: result,
               },
            }));
         } catch(error) {
            bridgeLogger.error('Command failed:', error);
            window.dispatchEvent(new CustomEvent('__mcp_exec_response', {
               detail: {
                  execId: request.execId,
                  success: false,
                  error: error.message || String(error),
               },
            }));
         }
      });

      // Listen for script execution results from eval() contexts
      // This forwards results from execute_js to Rust via invoke
      window.addEventListener('__mcp_script_result', async function(event) {
         var detail = event.detail;
         bridgeLogger.info('Script result received, forwarding to Rust:', detail.exec_id);

         try {
            await window.__TAURI__.core.invoke('plugin:mcp-bridge|script_result', {
               exec_id: detail.exec_id,
               success: detail.success,
               data: detail.data,
               error: detail.error
            });
            bridgeLogger.info('Script result forwarded successfully');
         } catch(err) {
            bridgeLogger.error('Failed to forward script result:', err);
         }
      });

      // Mark bridge as ready
      window.__MCP_BRIDGE_READY__ = true;
      bridgeLogger.info('Ready');

      // Notify Rust that the page has loaded
      notifyPageLoaded();
   });

   // Script Injection Functions
   window.__MCP_INJECT_SCRIPTS__ = function(scripts) {
      var script;
      if (!Array.isArray(scripts)) {
         bridgeLogger.error('Invalid scripts array');
         return;
      }
      scripts.forEach(function(entry) {
         if (!entry || !entry.id) {
            return;
         }
         if (document.querySelector('script[data-mcp-script-id="' + entry.id + '"]')) {
            bridgeLogger.info('Script already exists:', entry.id);
            return;
         }
         script = document.createElement('script');
         script.setAttribute('data-mcp-script-id', entry.id);
         if (entry.type === 'url') {
            script.src = entry.content;
            script.async = true;
            script.onload = function() {
               bridgeLogger.info('URL script loaded:', entry.id);
            };
            script.onerror = function() {
               bridgeLogger.error('Failed to load URL script:', entry.id);
            };
         } else {
            script.textContent = entry.content;
         }
         document.head.appendChild(script);
         bridgeLogger.info('Injected script:', entry.id);
      });
   };

   window.__MCP_REMOVE_SCRIPT__ = function(scriptId) {
      var script = document.querySelector('script[data-mcp-script-id="' + scriptId + '"]');
      if (script) {
         script.remove();
         bridgeLogger.info('Removed script:', scriptId);
      }
   };

   window.__MCP_CLEAR_SCRIPTS__ = function() {
      var scripts = document.querySelectorAll('script[data-mcp-script-id]');
      scripts.forEach(function(s) {
         s.remove();
      });
      bridgeLogger.info('Cleared', scripts.length, 'scripts');
   };

   function notifyPageLoaded() {
      if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
         window.__TAURI__.core.invoke('plugin:mcp-bridge|request_script_injection')
            .catch(function(err) {
               bridgeLogger.warn('Script injection request:', err.message || 'not available');
            });
      }
   }

   window.addEventListener('popstate', function() {
      bridgeLogger.info('Navigation detected (popstate)');
      notifyPageLoaded();
   });
}());

/**
 * Wait for conditions script - waits for selectors, text, or events
 *
 * @param {Object} params
 * @param {string} params.type - What to wait for: 'selector', 'text', 'ipc-event'
 * @param {string} params.value - Selector, text, or event name to wait for
 * @param {number} params.timeout - Timeout in milliseconds
 */
(async function(params) {
   const { type, value, timeout } = params;
   const startTime = Date.now();

   return new Promise((resolve, reject) => {
      function check() {
         if (Date.now() - startTime > timeout) {
            reject(new Error(`Timeout waiting for ${type}: ${value}`));
            return;
         }

         if (type === 'selector') {
            const element = document.querySelector(value);
            if (element) {
               resolve(`Element found: ${value}`);
               return;
            }
         } else if (type === 'text') {
            const found = document.body.innerText.includes(value);
            if (found) {
               resolve(`Text found: ${value}`);
               return;
            }
         } else if (type === 'ipc-event') {
            // For IPC events, we'd need to set up a listener
            // This is a simplified version
            reject(new Error('IPC event waiting not yet implemented in this context'));
            return;
         }

         setTimeout(check, 100);
      }

      check();
   });
})

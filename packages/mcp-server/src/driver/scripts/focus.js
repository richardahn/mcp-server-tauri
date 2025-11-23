/**
 * Focus an element
 *
 * @param {Object} params
 * @param {string} params.selector - CSS selector for element to focus
 */
(function(params) {
   const { selector } = params;

   const element = document.querySelector(selector);
   if (!element) {
      throw new Error(`Element not found: ${selector}`);
   }

   element.focus();
   return `Focused element: ${selector}`;
})

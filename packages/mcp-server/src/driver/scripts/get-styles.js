/**
 * Get computed CSS styles for elements
 *
 * @param {Object} params
 * @param {string} params.selector - CSS selector for element(s)
 * @param {string[]} params.properties - Specific CSS properties to retrieve
 * @param {boolean} params.multiple - Whether to get styles for all matching elements
 */
(function(params) {
   const { selector, properties, multiple } = params;

   const elements = multiple
      ? Array.from(document.querySelectorAll(selector))
      : [document.querySelector(selector)];

   if (!elements[0]) {
      throw new Error(`Element not found: ${selector}`);
   }

   const results = elements.map(element => {
      const styles = window.getComputedStyle(element);

      if (properties.length > 0) {
         const result = {};
         properties.forEach(prop => {
            result[prop] = styles.getPropertyValue(prop);
         });
         return result;
      }

      // Return all styles
      const allStyles = {};
      for (let i = 0; i < styles.length; i++) {
         const prop = styles[i];
         allStyles[prop] = styles.getPropertyValue(prop);
      }
      return allStyles;
   });

   return JSON.stringify(multiple ? results : results[0]);
})

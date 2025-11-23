import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import './custom.css';
import Feature from './components/Feature.vue';

export default {
   extends: DefaultTheme,
   Layout: () => {
      // Slots for custom layout components if needed
      return h(DefaultTheme.Layout, null, {});
   },
   enhanceApp({ app }) {
      // Register custom components
      // eslint-disable-next-line vue/multi-word-component-names
      app.component('Feature', Feature);
   },
} satisfies Theme;

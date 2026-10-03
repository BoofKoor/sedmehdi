import { defineConfig } from 'astro/config';

// Code blocks get tabindex="0" so one wider than its box can be scrolled from the keyboard
// (Shiki used to add this; it goes away with syntaxHighlight: false). Astro 7 renders Markdown with
// Sätteri, whose processor exposes options.hastPlugins for integrations to extend: no extra package needed.
const focusableCode = {
  name: 'focusable-code',
  hooks: {
    'astro:config:setup': ({ config, logger }) => {
      const processor = config.markdown.processor;
      if (processor?.name !== 'satteri') { logger.warn('Markdown processor is not Sätteri: code blocks get no tabindex.'); return; }
      processor.options.hastPlugins.push({
        name: 'focusable-code',
        element: { filter: ['pre'], visit(node, ctx) { ctx.setProperty(node, 'tabIndex', 0); } },
      });
    },
  },
};

export default defineConfig({
  // Used for canonical URLs.
  site: 'https://sedmehdi.com',
  // Code blocks follow the design tokens (--color-background-secondary, DM Mono) in both themes,
  // instead of Shiki's fixed dark theme with inline colours.
  markdown: { syntaxHighlight: false },
  integrations: [focusableCode],
});

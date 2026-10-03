import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    role: z.string(),
    status: z.string(),
    period: z.string().optional(),
    stack: z.array(z.string()),
    metric: z.object({ value: z.string(), label: z.string() }).optional(),
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
    // a live demo hosted on this site (a path, e.g. the admin panel demo under /lab/), shown as a "Live demo" button
    lab: z.string().startsWith('/').optional(),
    // a wide screenshot, 1600x611, in public/projects/
    cover: z.object({ src: z.string(), alt: z.string() }).optional(),
    // the project's own logo (an SVG in public/projects/logos/), its tile colour and the brand colour for glows
    logo: z.object({ src: z.string(), bg: z.string(), tint: z.string() }).optional(),
    // how the screenshot is framed: a browser window (sites) or a phone (mobile-first apps; portrait screenshot, 390x844 at 2x)
    device: z.enum(['browser', 'phone']).default('browser'),
    // the project's own colour for its card; white text on it must reach 4.5:1
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

export const collections = { projects };

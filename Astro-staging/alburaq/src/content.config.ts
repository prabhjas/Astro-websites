import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.string().optional(),
    image: z.string().optional(),
    category: z.string().optional(),
    author: z.string().optional().default('Al Buraq'),
  }),
});

export const collections = { blog };

import { httpGet } from './http.ts';

const WORDPRESS_URL = 'https://www.na-ireland.org/wp-json/wp/v2/posts?categories=9';

export interface WpPost {
  title: { rendered: string };
  excerpt: { rendered: string };
  link: string;
}

/**
 * Fetches NA Ireland WordPress posts for category 9 (events/news).
 */
export async function getPosts(): Promise<WpPost[]> {
  return httpGet<WpPost[]>(WORDPRESS_URL);
}

import { httpGet } from './http.ts';

const JFT_URL = 'https://www.jftna.org/jft/';

/**
 * Fetches the Just For Today reading and returns the raw HTML string.
 */
export async function getJft(): Promise<string> {
  return httpGet<string>(JFT_URL);
}

import { httpGet } from './http.ts';

const CONVENTIONS_URL = 'https://nasouth.ie/conventions.json';

export interface Speaker {
  Title: string;
  fileName: string;
}

export interface Convention {
  convention_name: string;
  speakers: Speaker[];
}

export interface ConventionsResponse {
  Conventions: Convention[];
}

/**
 * Fetches the list of NA Ireland conventions and speakers.
 */
export async function getConventions(): Promise<ConventionsResponse> {
  return httpGet<ConventionsResponse>(CONVENTIONS_URL);
}

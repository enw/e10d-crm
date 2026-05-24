export type EnrichmentResult = {
  company?: string;
  title?: string;
  location?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  raw: Record<string, unknown>;
};

export interface Enricher {
  id: string;
  enrich(email: string): Promise<EnrichmentResult>;
}

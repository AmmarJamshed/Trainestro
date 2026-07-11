import type { Provider, ScrapedTraining } from "@/lib/types";

export interface ScraperResult {
  scraperKey: string;
  trainings: ScrapedTraining[];
  warnings: string[];
}

export interface ProviderScraper {
  key: string;
  name: string;
  scrape: (provider: Provider) => Promise<ScraperResult>;
}

export abstract class BaseScraper implements ProviderScraper {
  abstract key: string;
  abstract name: string;

  abstract scrape(provider: Provider): Promise<ScraperResult>;

  protected empty(warnings: string[] = []): ScraperResult {
    return { scraperKey: this.key, trainings: [], warnings };
  }
}

import type { ProviderScraper } from "@/lib/scrapers/base";
import {
  AiDatayardScraper,
  AtomcampScraper,
  IbaCeeScraper,
  IbaCictScraper,
  LrcScraper,
  NibafScraper,
  NustPdcScraper,
  PixelArtScraper,
} from "@/lib/scrapers/providers/index";

const scrapers: ProviderScraper[] = [
  new NibafScraper(),
  new LrcScraper(),
  new AtomcampScraper(),
  new AiDatayardScraper(),
  new PixelArtScraper(),
  new IbaCeeScraper(),
  new IbaCictScraper(),
  new NustPdcScraper(),
];

export function getAllScrapers() {
  return scrapers;
}

export function getScraper(key: string) {
  return scrapers.find((s) => s.key === key) ?? null;
}

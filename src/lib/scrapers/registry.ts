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
import {
  GdgScraper,
  IbmSkillsbuildScraper,
  MicrosoftStudentsScraper,
  OracleUniversityScraper,
} from "@/lib/scrapers/providers/global-programs";
import {
  FastCoeeScraper,
  FlatironScraper,
  ImperialLllScraper,
  LumsCesScraper,
  LumsRedcScraper,
  ManchesterDubaiScraper,
  StanfordCsScraper,
} from "@/lib/scrapers/providers/training-centres";

const scrapers: ProviderScraper[] = [
  new NibafScraper(),
  new LrcScraper(),
  new AtomcampScraper(),
  new AiDatayardScraper(),
  new PixelArtScraper(),
  new IbaCeeScraper(),
  new IbaCictScraper(),
  new NustPdcScraper(),
  new LumsRedcScraper(),
  new LumsCesScraper(),
  new FastCoeeScraper(),
  new GdgScraper(),
  new MicrosoftStudentsScraper(),
  new IbmSkillsbuildScraper(),
  new OracleUniversityScraper(),
  new StanfordCsScraper(),
  new FlatironScraper(),
  new ImperialLllScraper(),
  new ManchesterDubaiScraper(),
];

export function getAllScrapers() {
  return scrapers;
}

export function getScraper(key: string) {
  return scrapers.find((s) => s.key === key) ?? null;
}

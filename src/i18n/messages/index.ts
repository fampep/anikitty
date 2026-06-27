import type { Locale } from "../config";
import type { Messages } from "../translate";
import { deepMergeMessages } from "../translate";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import de from "./de.json";
import da from "./da.json";
import pt from "./pt.json";
import ja from "./ja.json";
import ko from "./ko.json";
import zh from "./zh.json";

const catalogs: Record<Locale, Partial<Messages>> = {
  en,
  es: es as unknown as Partial<Messages>,
  fr: fr as unknown as Partial<Messages>,
  de: de as Partial<Messages>,
  da: da as Partial<Messages>,
  pt: pt as Partial<Messages>,
  ja: ja as Partial<Messages>,
  ko: ko as Partial<Messages>,
  zh: zh as Partial<Messages>,
};

export function getMessages(locale: Locale): Messages {
  const partial = catalogs[locale] ?? en;
  if (locale === "en") return en;
  return deepMergeMessages(en, partial) as Messages;
}

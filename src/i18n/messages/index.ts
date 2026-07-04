import type { Messages } from "../translate";
import en from "./en.json";

export function getMessages(_locale?: string): Messages {
  return en;
}

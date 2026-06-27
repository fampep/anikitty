import type en from "./messages/en.json";

export type Messages = typeof en;

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

export function getNestedMessage(obj: Record<string, unknown>, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);

  return typeof value === "string" ? value : undefined;
}

export function createTranslator(messages: Messages) {
  return function t(key: string, vars?: Record<string, string | number>): string {
    const text = getNestedMessage(messages as Record<string, unknown>, key);
    if (!text) return key;
    return interpolate(text, vars);
  };
}

export function deepMergeMessages<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const out = { ...base } as T;
  for (const key of Object.keys(override) as (keyof T)[]) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (
      baseVal &&
      overrideVal &&
      typeof baseVal === "object" &&
      typeof overrideVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      out[key] = deepMergeMessages(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>,
      ) as T[keyof T];
    } else if (overrideVal !== undefined) {
      out[key] = overrideVal as T[keyof T];
    }
  }
  return out;
}

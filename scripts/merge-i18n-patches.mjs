import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../src/i18n/messages");
const patchesDir = path.join(__dirname, "../src/i18n/patches");

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function flat(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flat(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

const en = JSON.parse(fs.readFileSync(path.join(messagesDir, "en.json"), "utf8"));
const enFlat = flat(en);

for (const file of fs.readdirSync(patchesDir).filter((f) => f.endsWith(".json"))) {
  const locale = file.replace(".json", "");
  const localePath = path.join(messagesDir, `${locale}.json`);
  const patchPath = path.join(patchesDir, file);

  if (!fs.existsSync(localePath)) {
    console.warn(`Skip ${locale}: no messages file`);
    continue;
  }

  const localeJson = JSON.parse(fs.readFileSync(localePath, "utf8"));
  const patch = JSON.parse(fs.readFileSync(patchPath, "utf8"));
  deepMerge(localeJson, patch);

  fs.writeFileSync(localePath, `${JSON.stringify(localeJson, null, 2)}\n`, "utf8");

  const mergedFlat = flat(localeJson);
  const missing = Object.keys(enFlat).filter((k) => !(k in mergedFlat));
  console.log(`${locale}.json: merged — missing ${missing.length} keys vs en`);
  if (missing.length) {
    console.log(`  ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`);
  }
}

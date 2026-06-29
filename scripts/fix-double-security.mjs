import fs from "fs";
import path from "path";

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, cb);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) cb(p);
  }
}

let n = 0;
walk(path.resolve("src"), (file) => {
  let c = fs.readFileSync(file, "utf8");
  const next = c.replaceAll("@/lib/security/security/", "@/lib/security/");
  if (next !== c) {
    fs.writeFileSync(file, next);
    n++;
  }
});
console.log(`fixed ${n} files`);

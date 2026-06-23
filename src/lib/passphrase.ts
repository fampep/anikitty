// Passphrase-based auth — the passphrase IS the identity.
// We derive a stable (email, password, username) from it so PocketBase
// never needs a real email and the user only ever types their passphrase.

const WORDS = [
  "able","absence","abundant","accept","account","achieve","across","action",
  "active","adapt","address","adjust","admire","adopt","advance","advice",
  "afford","afraid","after","agree","ahead","alarm","alert","alike","align",
  "alive","allow","alone","alter","always","ample","anchor","angel","angle",
  "angry","annual","appear","apple","apply","argue","arise","around","arrive",
  "artist","aspect","assist","attach","attack","attend","attract","aware",
  "awful","balance","banner","barely","battle","beauty","before","begin",
  "belief","belong","better","beyond","bitter","blade","blank","bless",
  "blind","block","bloom","blunt","bonus","border","bounce","brave","break",
  "bridge","bright","bring","broad","broken","budget","build","bundle",
  "burden","cabin","capture","carbon","carry","castle","cause","cement",
  "change","chapter","charge","charity","cheap","choice","circle","citizen",
  "civil","claim","classic","clean","clear","clever","climb","clock","cloud",
  "coast","coffee","collect","colony","color","column","commit","common",
  "connect","control","corner","correct","couple","courage","crash","create",
  "credit","crown","crush","current","curve","custom","damage","danger",
  "daring","debate","decide","defend","define","degree","deliver","demand",
  "depend","desert","desire","detail","differ","direct","discover","distant",
  "divide","dollar","domain","double","doubt","dream","drive","during",
  "eager","early","earth","effort","emerge","empire","enable","energy",
  "engage","enhance","entire","equal","escape","event","every","evolve",
  "exact","expand","expert","explain","extreme","fabric","factor","fairly",
  "fallen","famous","fancy","father","feature","field","figure","final",
  "finish","flame","flavor","flight","floor","flower","focus","forest",
  "forget","formal","forth","found","fourth","frame","fresh","friend",
  "front","frozen","future","galaxy","gather","general","gentle","giant",
  "giraffe","given","global","grace","grant","grass","great","green",
  "ground","group","growth","guard","guide","guilty","handle","happen",
  "harbor","hardly","harvest","health","heavy","height","hidden","honor",
  "impact","improve","include","inner","input","inside","instant","intent",
  "island","issue","journey","jungle","justify","kingdom","labor","landscape",
  "launch","layer","leader","learn","legacy","legal","level","liberty",
  "light","likely","limit","listen","local","logic","lonely","lower",
  "loyal","lucky","magic","major","manage","manner","market","master",
  "matter","meaning","measure","mental","merely","merge","method","middle",
  "mighty","mirror","mission","mobile","model","modest","moment","moral",
  "motion","mount","mutual","narrow","nature","nearly","never","noble",
  "normal","notice","novel","obtain","ocean","offer","often","online",
  "opinion","orange","origin","output","outside","panel","parent","partner",
  "pattern","people","perfect","period","permit","phrase","pilot","planet",
  "plenty","policy","portal","power","prefer","present","pretty","price",
  "pride","primary","prior","process","profit","project","proper","protect",
  "prove","public","purple","pursue","quest","quick","quiet","quote",
  "raise","random","range","rapid","reach","reason","reduce","reflect",
  "refuse","region","relay","remain","remote","remove","repair","repeat",
  "require","resist","result","return","reveal","reward","right","robot",
  "robust","rocket","rough","round","rural","safety","sample","scale",
  "scene","score","search","second","secret","secure","select","sense",
  "series","serve","signal","silent","silver","simple","single","skill",
  "slight","smooth","solar","solid","solve","source","south","space",
  "speak","speed","spirit","spread","stable","state","status","steady",
  "stone","store","storm","story","street","strike","strong","style",
  "sugar","sunny","supply","symbol","system","target","teach","theme",
  "theory","timber","tower","track","trade","train","travel","treat",
  "trend","trial","trust","truth","unable","under","united","update",
  "useful","value","vessel","village","vision","visual","vital","volume",
  "voyage","wallet","wanted","wealth","window","winter","wisdom","within",
  "wonder","world","worry","worth","writer","yearly","yellow",
] as const;

const SALT = "kittyanime-v1";

async function sha256hex(text: string): Promise<string> {
  // globalThis.crypto works in both browser and Node.js 18+
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node.js fallback (SSR without webcrypto)
  const { createHash } = await import("crypto");
  return createHash("sha256").update(text).digest("hex");
}

export function generatePassphrase(count = 12): string {
  const wCrypto = globalThis.crypto;
  let nums: number[];
  if (wCrypto?.getRandomValues) {
    const arr = new Uint32Array(count);
    wCrypto.getRandomValues(arr);
    nums = Array.from(arr);
  } else {
    nums = Array.from({ length: count }, () => Math.floor(Math.random() * 0xffffffff));
  }
  const pool = [...WORDS];
  const chosen: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = nums[i] % pool.length;
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return chosen.join(" ");
}

export function normalizePassphrase(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function passphraseToCredentials(passphrase: string) {
  const normalized = normalizePassphrase(passphrase);
  const h = await sha256hex(normalized + SALT);
  // Fake email hidden from user — only used internally by PocketBase
  const email = `${h.slice(0, 24)}@kitty.pw`;
  // Password: full hash + fixed suffix to satisfy complexity rules
  const password = h + "Kx9!";
  // Display username derived from first two words + short hash suffix
  const words = normalized.split(" ");
  const username = `${words[0]}_${words[1]}_${h.slice(0, 5)}`;
  return { email, password, username, normalized };
}

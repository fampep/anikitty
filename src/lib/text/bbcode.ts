/** Supported BBCode tags for profile bios. */

export type BbNode =
  | { type: "text"; value: string }
  | { type: "tag"; name: string; attr?: string; children: BbNode[] };

const BLOCK_TAGS = new Set(["quote", "code", "center", "left", "right", "list", "spoiler"]);
const INLINE_TAGS = new Set(["b", "i", "u", "s", "color", "size", "url", "img"]);
const ALL_TAGS = new Set([...BLOCK_TAGS, ...INLINE_TAGS, "hr", "li"]);

type StackFrame = {
  name: string;
  attr?: string;
  children: BbNode[];
};

function appendText(stack: StackFrame[], value: string) {
  if (!value) return;
  const frame = stack[stack.length - 1];
  const last = frame.children[frame.children.length - 1];
  if (last?.type === "text") {
    last.value += value;
  } else {
    frame.children.push({ type: "text", value });
  }
}

function closeTag(stack: StackFrame[], name: string): boolean {
  if (stack.length <= 1) return false;
  const top = stack[stack.length - 1];
  if (top.name !== name) return false;

  stack.pop();
  const parent = stack[stack.length - 1];
  parent.children.push({
    type: "tag",
    name: top.name,
    attr: top.attr,
    children: top.children,
  });
  return true;
}

function openTag(stack: StackFrame[], name: string, attr?: string) {
  if (name === "li") {
    const parent = stack[stack.length - 1];
    if (parent.name !== "list") return;
    const li: BbNode = { type: "tag", name: "li", children: [] };
    parent.children.push(li);
    stack.push({ name: "li", children: li.children });
    return;
  }

  if (name === "hr") {
    stack[stack.length - 1].children.push({ type: "tag", name: "hr", children: [] });
    return;
  }

  if (!ALL_TAGS.has(name)) return;
  stack.push({ name, attr, children: [] });
}

/** Parse BBCode into an AST. Unknown tags are left as plain text. */
export function parseBbcode(input: string): BbNode[] {
  const rootChildren: BbNode[] = [];
  const stack: StackFrame[] = [{ name: "__root__", children: rootChildren }];
  const re = /\[(\/)?([a-z*]+)(?:=([^\]]*))?\]/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const [full, closingSlash, rawName, rawAttr] = match;
    const name = rawName.toLowerCase();
    const attr = rawAttr?.trim();

    if (match.index > lastIndex) {
      appendText(stack, input.slice(lastIndex, match.index));
    }
    lastIndex = match.index + full.length;

    if (name === "hr" && !closingSlash) {
      openTag(stack, "hr");
      continue;
    }

    if (name === "*" && !closingSlash) {
      if (stack.length > 1 && stack[stack.length - 1].name === "li") {
        closeTag(stack, "li");
      }
      openTag(stack, "li");
      continue;
    }

    if (closingSlash) {
      if (!ALL_TAGS.has(name)) {
        appendText(stack, full);
        continue;
      }
      if (!closeTag(stack, name)) {
        appendText(stack, full);
      }
      continue;
    }

    if (!ALL_TAGS.has(name)) {
      appendText(stack, full);
      continue;
    }

    openTag(stack, name, attr);
  }

  if (lastIndex < input.length) {
    appendText(stack, input.slice(lastIndex));
  }

  while (stack.length > 1) {
    const frame = stack.pop()!;
    stack[stack.length - 1].children.push({
      type: "tag",
      name: frame.name,
      attr: frame.attr,
      children: frame.children,
    });
  }

  return rootChildren;
}

const NAMED_COLORS = new Set([
  "white",
  "black",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "violet",
  "pink",
  "gray",
  "grey",
  "cyan",
  "magenta",
  "gold",
  "silver",
]);

export function sanitizeBbColor(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (NAMED_COLORS.has(value)) return value;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value;
  return null;
}

export function sanitizeBbSize(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(32, Math.max(10, n));
}

export function extractPlainBioText(input: string): string {
  return input
    .replace(/\[(\/)?[a-z*]+(?:=[^\]]*)?\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const PROFILE_BIO_MAX_LENGTH = 800;

export const PROFILE_BBCODE_HINT =
  "[b]bold[/b] [i]italic[/i] [u]underline[/u] [s]strike[/s] [color=#a78bfa]color[/color] [size=14]size[/size] [url=https://…]link[/url] [quote]quote[/quote] [spoiler]hidden[/spoiler] [list][*]one[*]two[/list] [center]center[/center] [code]code[/code] [hr]";

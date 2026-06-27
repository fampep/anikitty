/** Lightweight user-agent parsing for session device labels. */
export function deviceLabelFromUserAgent(ua: string | null | undefined): string {
  if (!ua?.trim()) return "Unknown device";

  const s = ua;

  let browser = "Browser";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/OPR\//i.test(s) || /Opera/i.test(s)) browser = "Opera";
  else if (/Chrome\//i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s)) browser = "Safari";

  let os = "Unknown OS";
  if (/iPhone|iPad|iPod/i.test(s)) os = /iPad/i.test(s) ? "iPad" : "iPhone";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Windows/i.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/Linux/i.test(s)) os = "Linux";

  return `${browser} on ${os}`;
}

export function maskIpAddress(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length > 2) return `${parts.slice(0, 3).join(":")}:…`;
    return ip;
  }
  const octets = ip.split(".");
  if (octets.length === 4) return `${octets[0]}.${octets[1]}.${octets[2]}.x`;
  return ip;
}

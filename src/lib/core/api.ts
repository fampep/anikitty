import axios from "axios";
import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from "@/lib/security/anti-scrape";

export const api = axios.create({
  headers: { [CLIENT_HEADER]: CLIENT_HEADER_VALUE },
});

function isCrossOrigin(url: string | undefined): boolean {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false; // relative → our own API
  if (typeof window === "undefined") return true; // SSR: any absolute URL is external
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * The client marker is only for our own API. Sending it to third parties
 * (e.g. graphql.anilist.co) triggers a CORS preflight they reject, so strip it
 * from any cross-origin request.
 */
api.interceptors.request.use((config) => {
  if (isCrossOrigin(config.url) && config.headers) {
    const headers = config.headers as {
      delete?: (name: string) => void;
      [key: string]: unknown;
    };
    if (typeof headers.delete === "function") {
      headers.delete(CLIENT_HEADER);
    } else {
      delete headers[CLIENT_HEADER];
    }
  }
  return config;
});

// Pure string handling (no URL class: React Native's is incomplete), so tests run in Node.

const HTTP_URL = /^(https?:\/\/[^\s/?#:]+(?::\d{1,5})?)(\/[^\s?#]*)?$/i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/** What a person typed, as the API base: "192.168.1.20:4000" becomes "http://192.168.1.20:4000/api". Null if not an http(s) address. */
export function normalizeApiUrl(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const match = HTTP_URL.exec(HAS_SCHEME.test(text) ? text : `http://${text}`);
  if (!match) return null;
  const path = (match[2] ?? '').replace(/\/+$/, '');
  return `${match[1]}${path || '/api'}`;
}

export interface SetupLink {
  apiUrl: string;
  key: string;
  printer?: { host: string; port: number };
}

const LINK = /^medios-reception:\/\/setup\/?\?(.*)$/i;
const PRINTER = /^tcp:\/\/([^:/\s]+):(\d{1,5})$/i;

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

/** `medios-reception://setup?api=…&key=mqk_…&printer=tcp://host:port`; null unless the address is http(s) and the key starts `mqk_`. */
export function parseSetupLink(url: string): SetupLink | null {
  const match = LINK.exec(url.trim());
  if (!match) return null;
  const params: Record<string, string> = {};
  for (const pair of match[1].split('&')) {
    const at = pair.indexOf('=');
    if (at > 0) params[decode(pair.slice(0, at))] = decode(pair.slice(at + 1));
  }
  const apiUrl = params.api && HAS_SCHEME.test(params.api) ? normalizeApiUrl(params.api) : null;
  if (!apiUrl || !/^mqk_\S+$/.test(params.key ?? '')) return null;
  const link: SetupLink = { apiUrl, key: params.key };
  const printer = PRINTER.exec(params.printer ?? '');
  if (printer && Number(printer[2]) <= 65535) link.printer = { host: printer[1], port: Number(printer[2]) };
  return link;
}

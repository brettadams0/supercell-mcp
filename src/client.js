import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithTimeout, responseError } from './shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CREDENTIALS_DIR = path.join(__dirname, '..', 'credentials');

const GAME_NAMES = { clashofclans: 'Clash of Clans', clashroyale: 'Clash Royale', brawlstars: 'Brawl Stars' };

const tokenCache = new Map();

// Supercell API tokens are bound to a whitelisted public IP at generation
// time. If your home IP changes (dynamic IP from your ISP), calls start
// failing with 403 until you regenerate the key for your new IP at the
// relevant developer portal.
async function loadToken(filePath, portalUrl, legacyPath) {
  if (tokenCache.has(filePath)) return tokenCache.get(filePath);
  const missing = () => {
    throw new Error(`Missing ${filePath}. Create it with {"token": "..."} from ${portalUrl} (key must be whitelisted for your current public IP).`);
  };
  // An install set up before the file was renamed still has the old name.
  const raw = await readFile(filePath, 'utf-8').catch(() =>
    legacyPath ? readFile(legacyPath, 'utf-8').catch(missing) : missing()
  );
  const { token } = JSON.parse(raw);
  tokenCache.set(filePath, token);
  return token;
}

/**
 * Explain a 403. Supercell uses it for two different problems: a key that is
 * simply wrong, and — far more often — a valid key used from an IP it was not
 * issued for. The body says which, and names the IP it saw, which is exactly
 * what the developer portal asks for when minting a replacement.
 */
export async function forbiddenError(res, label, portalUrl) {
  const body = await res.json().catch(() => ({}));
  if (String(body.reason ?? '').includes('invalidIp')) {
    const ip = String(body.message ?? '').match(/(?:::ffff:)?\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]{3,}:[0-9a-f:]+/i)?.[0];
    return new Error(
      `${label} refused the key: it is not allowed from ${ip ? `IP ${ip}` : 'this IP'}. Keys are bound to the IP they were created for — mint one for ${ip ?? 'your current public IP'} at ${portalUrl}.`
    );
  }
  return new Error(`${label} refused the key (403${body.reason ? ` ${body.reason}` : ''}). Check the token in the credentials file, or mint a new one at ${portalUrl}.`);
}

/**
 * A client for one game's API. The credentials file is named after `game`,
 * and is exposed on the returned function so a test can hold it to the
 * documented name — a mismatch there fails only at call time, on the user's
 * machine.
 */
export function makeClient(game, baseUrl, portalUrl, { legacyName } = {}) {
  const credentialsFile = path.join(CREDENTIALS_DIR, `${game}.json`);
  const legacyFile = legacyName && path.join(CREDENTIALS_DIR, `${legacyName}.json`);
  const label = `${GAME_NAMES[game] ?? game} API`;

  async function get(pathname, query) {
    const token = await loadToken(credentialsFile, portalUrl, legacyFile);
    const url = new URL(`${baseUrl}${pathname}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
    }
    const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }, label);
    if (res.status === 403) throw await forbiddenError(res, label, portalUrl);
    if (!res.ok) throw await responseError(res, label, pathname);
    return res.json();
  }

  get.credentialsFile = credentialsFile;
  return get;
}

/**
 * Normalise and encode a player or clan tag for the URL path.
 *
 * Tags are written "#2PP0JCVL". The '#' must be percent-encoded, or it is
 * parsed as a fragment and silently truncates the request. The tag alphabet
 * has no letter O, so an O is always a mistyped zero and is corrected rather
 * than sent off to 404. Anything else outside [0-9A-Z] is refused.
 */
export function encodeTag(tag) {
  const normalized = tag.trim().toUpperCase().replace(/^#/, '').replace(/O/g, '0');
  if (!/^[0-9A-Z]{3,15}$/.test(normalized)) {
    throw new Error(`"${tag}" is not a Supercell tag; expected something like "#2PP0JCVL".`);
  }
  return encodeURIComponent(`#${normalized}`);
}

/** Validate a rankings location: a two-letter country code or "global". */
export function countryCode(code) {
  if (!/^([A-Za-z]{2}|global)$/.test(code)) {
    throw new Error(`"${code}" is not a country code; use two letters such as "CA", or "global".`);
  }
  return code;
}

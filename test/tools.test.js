import test from 'node:test';
import assert from 'node:assert/strict';

import { existsSync } from 'node:fs';
import path from 'node:path';

import { client as cocClient, registerClashOfClansTools } from '../src/clashofclans.js';
import { client as crClient, registerClashRoyaleTools } from '../src/clashroyale.js';
import { client as bsClient, registerBrawlStarsTools } from '../src/brawlstars.js';
import { countryCode, encodeTag, forbiddenError, makeClient } from '../src/client.js';
import { REQUEST_TIMEOUT_MS, VERSION, fetchWithTimeout, responseError } from '../src/shared.js';

function collectTools() {
  const tools = new Map();
  const server = {
    registerTool(name, config, handler) {
      tools.set(name, { name, config, handler });
    },
  };
  registerClashOfClansTools(server);
  registerClashRoyaleTools(server);
  registerBrawlStarsTools(server);
  return tools;
}

test('all three games register their tools into one server', () => {
  assert.equal(collectTools().size, 15);
});

test('tool names are unique and prefixed by game', () => {
  const names = [...collectTools().keys()];
  assert.equal(new Set(names).size, names.length, 'duplicate tool name');
  for (const name of names) {
    assert.match(name, /^(coc|cr|bs)_[a-z0-9_]+$/, `"${name}" is not game-prefixed`);
  }
});

test('each game contributes tools under its own prefix', () => {
  const names = [...collectTools().keys()];
  for (const prefix of ['coc_', 'cr_', 'bs_']) {
    assert.ok(
      names.some((n) => n.startsWith(prefix)),
      `no tools registered for ${prefix}`
    );
  }
});

test('every tool declares a title, description and input schema', () => {
  for (const { name, config } of collectTools().values()) {
    assert.ok(config.title?.trim(), `${name} has no title`);
    assert.ok(config.description?.trim(), `${name} has no description`);
    assert.ok(config.inputSchema, `${name} has no inputSchema`);
  }
});

// Tags are written "#2PP0JCVL" but travel in the URL path, where the '#' would
// otherwise be parsed as a fragment delimiter and silently truncate the request.
test('encodeTag percent-encodes the leading hash', () => {
  assert.equal(encodeTag('#2PP0JCVL'), '%232PP0JCVL');
});

test('encodeTag adds the hash when the caller omits it', () => {
  assert.equal(encodeTag('2PP0JCVL'), '%232PP0JCVL');
  assert.equal(encodeTag('2PP0JCVL'), encodeTag('#2PP0JCVL'));
});

test('encodeTag leaves no bare # that could truncate the path', () => {
  for (const tag of ['#ABC123', 'ABC123']) {
    assert.doesNotMatch(encodeTag(tag), /#/, `${tag} still contains a raw #`);
  }
  // A second '#' used to be encoded and sent; it can never be part of a tag.
  assert.throws(() => encodeTag('#0LL#X'), /not a Supercell tag/);
});

// The tag alphabet has no letter O, so an O is always a mistyped zero.
test('encodeTag corrects the letter O to zero and normalises case', () => {
  assert.equal(encodeTag('#2pp0jcvl'), '%232PP0JCVL');
  assert.equal(encodeTag('2PPOJCVL'), '%232PP0JCVL');
  assert.equal(encodeTag('  #2PP0JCVL '), '%232PP0JCVL');
});

test('encodeTag refuses anything that could alter the path', () => {
  for (const tag of ['../clans', '#2PP/0J', 'ABC?x=1', '#', '']) {
    assert.throws(() => encodeTag(tag), /not a Supercell tag/, JSON.stringify(tag));
  }
});

// The IP-binding failure is the one every user of these APIs hits, and a bare
// "403" gives no clue what to do about it.
test('a missing key file explains where to get one', async () => {
  const get = makeClient('clashofclans', 'https://api.clashofclans.com/v1', 'https://developer.clashofclans.com');
  await assert.rejects(() => get('/players/%232PP0JCVL'), (err) => {
    assert.match(err.message, /clashofclans\.json/);
    assert.match(err.message, /developer\.clashofclans\.com/);
    assert.match(err.message, /IP/i);
    return true;
  });
});

// ---------------------------------------------------------------------------
// Credentials files. Each game reads credentials/<game>.json, and the README
// and the tracked example files say what <game> is. Clash of Clans read
// "coc.json" while both said "clashofclans.json", so a setup that followed the
// docs could never make a single Clash of Clans call — and no test noticed,
// because the failure only happens at call time on the user's machine.

test('every game reads the credentials file its example and the README name', () => {
  for (const [name, client] of [['Clash of Clans', cocClient], ['Clash Royale', crClient], ['Brawl Stars', bsClient]]) {
    const example = client.credentialsFile.replace(/\.json$/, '.example.json');
    assert.ok(existsSync(example), `${name} reads ${path.basename(client.credentialsFile)}, but there is no ${path.basename(example)}`);
  }
  assert.equal(path.basename(cocClient.credentialsFile), 'clashofclans.json');
});

// ---------------------------------------------------------------------------
// Other path segments.

test('rankings take a two-letter country code or "global", nothing else', async () => {
  assert.equal(countryCode('CA'), 'CA');
  assert.equal(countryCode('global'), 'global');
  for (const bad of ['../players', 'Canada', 'C', '']) {
    assert.throws(() => countryCode(bad), /not a country code/, JSON.stringify(bad));
  }
  const { handler } = collectTools().get('bs_get_rankings');
  await assert.rejects(() => handler({ countryCode: '../players', type: 'players' }), /not a country code/);
});

test('tools reject a malformed tag before reading a key or making a request', async () => {
  const tools = collectTools();
  for (const name of ['coc_get_player', 'cr_get_clan', 'bs_get_club_members']) {
    await assert.rejects(() => tools.get(name).handler({ tag: '../../clans' }), /not a Supercell tag/, name);
  }
});

// ---------------------------------------------------------------------------
// Failure messages.

test('a 403 for the wrong IP names the IP Supercell saw', async () => {
  const res = new Response(
    JSON.stringify({ reason: 'accessDenied.invalidIp', message: 'Invalid authorization: API key does not allow access from IP 203.0.113.7' }),
    { status: 403 }
  );
  const err = await forbiddenError(res, 'clashofclans API', 'https://developer.clashofclans.com');
  assert.match(err.message, /not allowed from IP 203\.0\.113\.7/);
  assert.match(err.message, /mint one for 203\.0\.113\.7 at https:\/\/developer\.clashofclans\.com/);
});

test('a 403 names an IPv4-mapped IPv6 address in full', async () => {
  const res = new Response(
    JSON.stringify({ reason: 'accessDenied.invalidIp', message: 'API key does not allow access from IP ::ffff:203.0.113.7' }),
    { status: 403 }
  );
  const err = await forbiddenError(res, 'clashofclans API', 'https://developer.clashofclans.com');
  assert.match(err.message, /mint one for ::ffff:203\.0\.113\.7 at/);
});

test('a 403 for a bad key does not blame the IP', async () => {
  const res = new Response(JSON.stringify({ reason: 'accessDenied', message: 'Invalid authorization' }), { status: 403 });
  const err = await forbiddenError(res, 'clashroyale API', 'https://developer.clashroyale.com');
  assert.match(err.message, /refused the key \(403 accessDenied\)/);
  assert.doesNotMatch(err.message, /IP/);
});

test('a 429 says when to retry, and error bodies are bounded', async () => {
  const limited = await responseError(new Response('{}', { status: 429, headers: { 'retry-after': '3' } }), 'brawlstars API', '/players/%23X');
  assert.match(limited.message, /rate limit reached for \/players\/%23X; retry after 3s/);
  const huge = await responseError(new Response('x'.repeat(50_000), { status: 503 }), 'brawlstars API', '/x');
  assert.ok(huge.message.length < 700);
});

test('every request carries a timeout, and a timeout reads as one', async () => {
  const original = globalThis.fetch;
  try {
    let signal;
    globalThis.fetch = async (_url, init) => {
      signal = init.signal;
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    };
    await assert.rejects(
      () => fetchWithTimeout('https://api.clashroyale.com/v1/cards', {}, 'clashroyale API'),
      new RegExp(`did not respond within ${REQUEST_TIMEOUT_MS / 1000}s`)
    );
    assert.ok(signal instanceof AbortSignal);
  } finally {
    globalThis.fetch = original;
  }
});

test('the server reports the version in package.json', async () => {
  const { readFile } = await import('node:fs/promises');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(VERSION, pkg.version);
});

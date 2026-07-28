import test from 'node:test';
import assert from 'node:assert/strict';

import { registerClashOfClansTools } from '../src/clashofclans.js';
import { registerClashRoyaleTools } from '../src/clashroyale.js';
import { registerBrawlStarsTools } from '../src/brawlstars.js';
import { encodeTag, makeClient } from '../src/client.js';

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
  for (const tag of ['#ABC123', 'ABC123', '#0LL#X']) {
    assert.doesNotMatch(encodeTag(tag), /#/, `${tag} still contains a raw #`);
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

# supercell-mcp

[![CI](https://github.com/brettadams0/supercell-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/brettadams0/supercell-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen.svg)](package.json)

One MCP server covering three Supercell game APIs — Clash of Clans, Clash Royale,
and Brawl Stars. They share an auth model and response style, so a single server
with prefixed tool names beats three near-identical ones.

Read-only. These APIs expose no write or messaging endpoints at all, so there is
nothing here that can change game state.

Runs over stdio, registered in `~/.claude.json` as `supercell`.

## Install

```bash
claude mcp add supercell -- npx -y @brettadams0/supercell-mcp
```

You also need a per-game API key in `credentials/` (see Setup).

Published as [`@brettadams0/supercell-mcp`](https://www.npmjs.com/package/@brettadams0/supercell-mcp).
The scope is there because the unscoped name was already taken on npm by an
unrelated package. Cloning this repo and pointing `claude mcp add` at
`src/index.js` works identically.

## Tools

Prefixes: `coc_` Clash of Clans, `cr_` Clash Royale, `bs_` Brawl Stars.

| Clash of Clans | Clash Royale | Brawl Stars |
|---|---|---|
| `coc_get_player` | `cr_get_player` | `bs_get_player` |
| `coc_get_clan` | `cr_get_clan` | `bs_get_club` |
| `coc_get_clan_members` | `cr_get_clan_members` | `bs_get_club_members` |
| `coc_search_clans` | `cr_search_clans` | `bs_get_rankings` |
| `coc_get_current_war` | `cr_get_player_battlelog` | `bs_get_player_battlelog` |

## Layout

```
src/client.js        shared auth + fetch, one base URL per game
src/clashofclans.js  coc_* tools
src/clashroyale.js   cr_* tools
src/brawlstars.js    bs_* tools
src/index.js         McpServer construction + stdio transport
```

## The IP allowlist gotcha

Supercell API keys are **bound to the IP address** they were created for. When
the home IP changes, every call starts returning `403 accessDenied` even though
the key is perfectly valid and unexpired.

That failure mode looks like an auth bug and isn't one. To fix it, mint a new key
for the current IP at the relevant developer portal:

- https://developer.clashofclans.com
- https://developer.clashroyale.com
- https://developer.brawlstars.com

Check the current public IP with `curl -s https://api.ipify.org` (already an
allowed command in `~/.claude/settings.json`).

## Setup

Requires Node 20+. Mint a key per game at the portal listed above, for your
current public IP, then save each one as `credentials/<game>.json`:

```
credentials/clashofclans.json
credentials/clashroyale.json
credentials/brawlstars.json
```

Each holds `{"token": "..."}` — see the matching `*.example.json`.
`credentials/` is git-ignored. A game whose key file is absent simply fails on
first call with a message naming the file and its portal; the other games keep
working.

```bash
npm ci
npm start
claude mcp add supercell -- node <path>/supercell-mcp/src/index.js
```

## Tests

```bash
npm test
```

Registration across all three games, tag encoding, and the missing-key error
message. No network and no credentials.

## Notes

- Player and clan tags start with `#` (e.g. `#2PP0JCVL`). The `#` is URL-encoded
  before the request — pass tags with the `#` included.
- Tags are unambiguous across games but not portable between them; a Clash Royale
  tag won't resolve against the Clash of Clans API.

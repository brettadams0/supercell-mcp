# supercell-mcp

[![CI](https://github.com/brettadams0/supercell-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/brettadams0/supercell-mcp/actions/workflows/ci.yml)
[![Surface checked by mcp-surface](https://img.shields.io/badge/surface-mcp--surface-7c3aed.svg)](https://github.com/brettadams0/mcp-surface)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen.svg)](package.json)

One [MCP](https://modelcontextprotocol.io) server covering three Supercell game APIs — Clash of Clans, Clash Royale,
and Brawl Stars. They share an auth model and response style, so a single server
with prefixed tool names beats three near-identical ones.

Read-only. These APIs expose no write or messaging endpoints at all, so there is
nothing here that can change game state.

15 tools. Runs locally over stdio.

## Tools

Prefixes: `coc_` Clash of Clans, `cr_` Clash Royale, `bs_` Brawl Stars.

| Clash of Clans | Clash Royale | Brawl Stars |
|---|---|---|
| `coc_get_player` | `cr_get_player` | `bs_get_player` |
| `coc_get_clan` | `cr_get_clan` | `bs_get_club` |
| `coc_get_clan_members` | `cr_get_clan_members` | `bs_get_club_members` |
| `coc_search_clans` | `cr_search_clans` | `bs_get_rankings` |
| `coc_get_current_war` | `cr_get_player_battlelog` | `bs_get_player_battlelog` |

Every tool is annotated `readOnlyHint: true`. The exact schemas the model sees
are in [`mcp-surface.json`](mcp-surface.json).

## Layout

```
src/shared.js        version, timeouts, error shaping, tool-result helpers
src/client.js        shared auth + fetch, tag and country-code validation
src/clashofclans.js  coc_* tools
src/clashroyale.js   cr_* tools
src/brawlstars.js    bs_* tools
src/index.js         McpServer construction + stdio transport
mcp-surface.json     the committed tool surface CI compares against
```

## The IP allowlist gotcha

Supercell API keys are **bound to the IP address** they were created for. When
the home IP changes, every call starts returning `403 accessDenied` even though
the key is perfectly valid and unexpired.

That failure mode looks like an auth bug and isn't one. Supercell's 403 body says
which it is, and names the IP it saw, so the error this server returns does too:

```
Clash of Clans API refused the key: it is not allowed from IP 203.0.113.7. Keys are
bound to the IP they were created for — mint one for 203.0.113.7 at https://developer.clashofclans.com
```

A key that is simply wrong gets a different message that doesn't mention IPs.
Mint a new key for the current IP at the relevant developer portal:

- https://developer.clashofclans.com
- https://developer.clashroyale.com
- https://developer.brawlstars.com


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
claude mcp add supercell -- node /absolute/path/to/supercell-mcp/src/index.js
```

Or in Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supercell": {
      "command": "node",
      "args": ["/absolute/path/to/supercell-mcp/src/index.js"]
    }
  }
}
```

## The credentials file nobody could have created

Until 1.1.0, the Clash of Clans client read `credentials/coc.json`, while this
README, the tracked example file and the error's own setup instructions all said
`clashofclans.json`. Following the documentation exactly produced a server
whose Clash of Clans tools could never succeed — and every test passed, because
the mismatch only surfaces at call time, on the user's machine, with real
credentials.

The name is fixed, and each game's client now exposes the file it reads, so a
test holds it to the tracked `*.example.json` beside it. Renaming one without
the other fails CI.

## Development

```bash
npm test               # unit tests — no network, no credentials
npm run lint           # ESLint
npm run surface        # start the server and diff its tool surface against mcp-surface.json
npm run surface:update # re-record mcp-surface.json after an intended change
```

The tests cover registration across all three games, tag normalisation and
encoding, path validation, the credentials-file names, both kinds of 403, and
rate-limit and timeout messages. CI runs them on Node 20, 22 and 24, then
starts the server with [mcp-surface](https://github.com/brettadams0/mcp-surface)
and fails if the tool surface differs from the committed snapshot.

## Notes

- Player and clan tags start with `#` (e.g. `#2PP0JCVL`). The `#` is optional
  and URL-encoded before the request; left raw, it would be read as a fragment
  and silently truncate the path. Tags are upper-cased, and since the tag
  alphabet has no letter O, an O is corrected to a zero rather than sent off to
  404.
- Every request has a 30-second timeout, error bodies are trimmed before they
  reach the model, and a 429 says when to retry. Results are compact JSON.
- Tags are unambiguous across games but not portable between them; a Clash Royale
  tag won't resolve against the Clash of Clans API.

## License

MIT — see [LICENSE](LICENSE). Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

# Changelog

Notable changes to this server. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The version is the
server's, as reported to clients in `initialize`; the tool surface itself is
recorded in [`mcp-surface.json`](mcp-surface.json).

## [1.1.0] — 2026-10-16

### Fixed

- **Clash of Clans could not be configured as documented.** Its client read
  `credentials/coc.json`, while the README, the example file and the error
  message all said `clashofclans.json`. A test now holds every game's
  credentials file to its tracked example.
- A 403 now says whether the key is wrong or used from the wrong IP, and in the
  second case names the IP Supercell saw — the value the developer portal asks
  for. It used to blame the IP for every 403.
- Tags are upper-cased and a letter O corrected to zero (the tag alphabet has
  none); anything else outside `[0-9A-Z]` is refused instead of being encoded
  into the path.
- `bs_get_rankings` validates its country code before putting it in the path.
- Every request has a 30-second timeout; a 429 reports when to retry, and error
  bodies are trimmed.

### Changed

- Tool results are compact JSON rather than indented.
- The server reports the version from `package.json`.

### Security

- Dependencies raised to clear every open `npm audit` advisory, including a
  critical one in `proxy-addr` and a high one in the MCP SDK's OAuth client.

### Added

- `mcp-surface.json` and a CI step that fails when the tool surface drifts
  from it. ESLint, Dependabot, Node 24 in the CI matrix.

## [1.0.0] — 2026-07-28

First public release: 15 read-only tools across three games, offline tests and CI.

[1.1.0]: https://github.com/brettadams0/supercell-mcp/compare/ed7f192...HEAD
[1.0.0]: https://github.com/brettadams0/supercell-mcp/tree/ed7f192

# Security

This server holds one API key per game, each bound by Supercell to a single
public IP. The APIs are read-only, and so is every tool here. Tags and country
codes are validated before they reach a request path.

Keys live in `credentials/`, which is git-ignored, and CI fails if a real
credential file is ever tracked. To revoke one, delete it at the game's
developer portal.

## Reporting a vulnerability

Please email **adamsbrett00@gmail.com** rather than opening a public issue.
You'll get a reply within a few days.

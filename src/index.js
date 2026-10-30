#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerClashOfClansTools } from './clashofclans.js';
import { registerClashRoyaleTools } from './clashroyale.js';
import { registerBrawlStarsTools } from './brawlstars.js';
import { VERSION } from './shared.js';

const server = new McpServer({ name: 'supercell', version: VERSION });

registerClashOfClansTools(server);
registerClashRoyaleTools(server);
registerBrawlStarsTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

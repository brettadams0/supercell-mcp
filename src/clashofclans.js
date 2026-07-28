import { z } from 'zod';
import { makeClient, encodeTag } from './client.js';

const get = makeClient('coc', 'https://api.clashofclans.com/v1', 'https://developer.clashofclans.com');

function json(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function registerClashOfClansTools(server) {
  server.registerTool(
    'coc_get_player',
    { title: 'Get Clash of Clans player', description: 'Full stats for a player by tag (with or without leading #).', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}`))
  );

  server.registerTool(
    'coc_get_clan',
    { title: 'Get Clash of Clans clan', description: 'Full details for a clan by tag.', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}`))
  );

  server.registerTool(
    'coc_get_clan_members',
    { title: 'Get clan member list', description: 'Member roster for a clan.', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}/members`))
  );

  server.registerTool(
    'coc_get_current_war',
    { title: 'Get current war', description: "A clan's current war status (if public / not in private war log).", inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}/currentwar`))
  );

  server.registerTool(
    'coc_search_clans',
    {
      title: 'Search clans',
      description: 'Search for clans by name and/or filters.',
      inputSchema: { name: z.string().optional(), minMembers: z.number().int().optional(), limit: z.number().int().min(1).max(50).optional() },
    },
    async ({ name, minMembers, limit }) => json(await get('/clans', { name, minMembers, limit: limit ?? 20 }))
  );
}

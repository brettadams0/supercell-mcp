import { z } from 'zod';
import { makeClient, encodeTag } from './client.js';

const get = makeClient('clashroyale', 'https://api.clashroyale.com/v1', 'https://developer.clashroyale.com');

function json(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function registerClashRoyaleTools(server) {
  server.registerTool(
    'cr_get_player',
    { title: 'Get Clash Royale player', description: 'Full stats for a player by tag.', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}`))
  );

  server.registerTool(
    'cr_get_player_battlelog',
    { title: "Get a player's recent battles", description: 'Recent battle history for a player.', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}/battlelog`))
  );

  server.registerTool(
    'cr_get_clan',
    { title: 'Get Clash Royale clan', description: 'Full details for a clan by tag.', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}`))
  );

  server.registerTool(
    'cr_get_clan_members',
    { title: 'Get clan member list', description: 'Member roster for a clan.', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}/members`))
  );

  server.registerTool(
    'cr_search_clans',
    {
      title: 'Search clans',
      description: 'Search for clans by name and/or filters.',
      inputSchema: { name: z.string().optional(), minMembers: z.number().int().optional(), limit: z.number().int().min(1).max(50).optional() },
    },
    async ({ name, minMembers, limit }) => json(await get('/clans', { name, minMembers, limit: limit ?? 20 }))
  );
}

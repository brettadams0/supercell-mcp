import { z } from 'zod';
import { makeClient, encodeTag } from './client.js';

const get = makeClient('clashroyale', 'https://api.clashroyale.com/v1', 'https://developer.clashroyale.com');

function json(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// See the note in clashofclans.js — Supercell tags contain no letter O.
const tagFor = (what) =>
  z
    .string()
    .describe(
      `${what} tag, e.g. "#2PP0JCCLY". The leading # is optional. Uppercase. Note the alphabet has no letter O — any round character is the digit zero.`
    );

export function registerClashRoyaleTools(server) {
  server.registerTool(
    'cr_get_player',
    { title: 'Get Clash Royale player', description: 'Full stats for a player by tag.', inputSchema: { tag: tagFor('Player') } },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}`))
  );

  server.registerTool(
    'cr_get_player_battlelog',
    { title: "Get a player's recent battles", description: 'Recent battle history for a player.', inputSchema: { tag: tagFor('Player') } },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}/battlelog`))
  );

  server.registerTool(
    'cr_get_clan',
    { title: 'Get Clash Royale clan', description: 'Full details for a clan by tag.', inputSchema: { tag: tagFor('Clan') } },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}`))
  );

  server.registerTool(
    'cr_get_clan_members',
    { title: 'Get clan member list', description: 'Member roster for a clan.', inputSchema: { tag: tagFor('Clan') } },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}/members`))
  );

  server.registerTool(
    'cr_search_clans',
    {
      title: 'Search clans',
      description: 'Search for clans by name and/or filters.',
      inputSchema: {
        name: z.string().optional().describe('Clan name or partial name to search for. Minimum 3 characters.'),
        minMembers: z.number().int().optional().describe('Only return clans with at least this many members (1-50).'),
        limit: z.number().int().min(1).max(50).optional().describe('Maximum clans to return, 1-50. Defaults to 20.'),
      },
    },
    async ({ name, minMembers, limit }) => json(await get('/clans', { name, minMembers, limit: limit ?? 20 }))
  );
}

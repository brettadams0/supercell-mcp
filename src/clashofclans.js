import { z } from 'zod';
import { makeClient, encodeTag } from './client.js';

const get = makeClient('coc', 'https://api.clashofclans.com/v1', 'https://developer.clashofclans.com');

function json(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// Supercell tags use a restricted alphabet that contains no letter O — every
// round character is a zero. Transcribing one as "O" is the single most common
// way a lookup 404s, so the description says so outright.
const tagFor = (what) =>
  z
    .string()
    .describe(
      `${what} tag, e.g. "#2PP0JCCLY". The leading # is optional. Uppercase. Note the alphabet has no letter O — any round character is the digit zero.`
    );

export function registerClashOfClansTools(server) {
  server.registerTool(
    'coc_get_player',
    {
      title: 'Get Clash of Clans player',
      annotations: { readOnlyHint: true, openWorldHint: true },
      description: 'Full stats for a player by tag (with or without leading #).',
      inputSchema: { tag: tagFor('Player') },
    },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}`))
  );

  server.registerTool(
    'coc_get_clan',
    { annotations: { readOnlyHint: true, openWorldHint: true }, title: 'Get Clash of Clans clan', description: 'Full details for a clan by tag.', inputSchema: { tag: tagFor('Clan') } },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}`))
  );

  server.registerTool(
    'coc_get_clan_members',
    { annotations: { readOnlyHint: true, openWorldHint: true }, title: 'Get clan member list', description: 'Member roster for a clan.', inputSchema: { tag: tagFor('Clan') } },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}/members`))
  );

  server.registerTool(
    'coc_get_current_war',
    {
      title: 'Get current war',
      annotations: { readOnlyHint: true, openWorldHint: true },
      description: "A clan's current war status (if public / not in private war log).",
      inputSchema: { tag: tagFor('Clan') },
    },
    async ({ tag }) => json(await get(`/clans/${encodeTag(tag)}/currentwar`))
  );

  server.registerTool(
    'coc_search_clans',
    {
      title: 'Search clans',
      annotations: { readOnlyHint: true, openWorldHint: true },
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

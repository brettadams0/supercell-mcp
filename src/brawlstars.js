import { z } from 'zod';
import { makeClient, encodeTag } from './client.js';

const get = makeClient('brawlstars', 'https://api.brawlstars.com/v1', 'https://developer.brawlstars.com');

function json(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function registerBrawlStarsTools(server) {
  server.registerTool(
    'bs_get_player',
    { title: 'Get Brawl Stars player', description: 'Full stats for a player by tag.', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}`))
  );

  server.registerTool(
    'bs_get_player_battlelog',
    { title: "Get a player's recent battles", description: 'Recent battle history for a player.', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}/battlelog`))
  );

  server.registerTool(
    'bs_get_club',
    { title: 'Get Brawl Stars club', description: "Full details for a club (Brawl Stars' equivalent of a clan) by tag.", inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/clubs/${encodeTag(tag)}`))
  );

  server.registerTool(
    'bs_get_club_members',
    { title: 'Get club member list', description: 'Member roster for a club.', inputSchema: { tag: z.string() } },
    async ({ tag }) => json(await get(`/clubs/${encodeTag(tag)}/members`))
  );

  server.registerTool(
    'bs_get_rankings',
    {
      title: 'Get player or club rankings',
      description: 'Leaderboard rankings by country code ("global" for worldwide).',
      inputSchema: { countryCode: z.string().default('global'), type: z.enum(['players', 'clubs']).default('players') },
    },
    async ({ countryCode, type }) => json(await get(`/rankings/${countryCode}/${type}`))
  );
}

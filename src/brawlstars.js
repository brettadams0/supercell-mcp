import { z } from 'zod';
import { makeClient, encodeTag } from './client.js';

const get = makeClient('brawlstars', 'https://api.brawlstars.com/v1', 'https://developer.brawlstars.com');

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

export function registerBrawlStarsTools(server) {
  server.registerTool(
    'bs_get_player',
    { title: 'Get Brawl Stars player', description: 'Full stats for a player by tag.', inputSchema: { tag: tagFor('Player') } },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}`))
  );

  server.registerTool(
    'bs_get_player_battlelog',
    { title: "Get a player's recent battles", description: 'Recent battle history for a player.', inputSchema: { tag: tagFor('Player') } },
    async ({ tag }) => json(await get(`/players/${encodeTag(tag)}/battlelog`))
  );

  server.registerTool(
    'bs_get_club',
    {
      title: 'Get Brawl Stars club',
      description: "Full details for a club (Brawl Stars' equivalent of a clan) by tag.",
      inputSchema: { tag: tagFor('Club') },
    },
    async ({ tag }) => json(await get(`/clubs/${encodeTag(tag)}`))
  );

  server.registerTool(
    'bs_get_club_members',
    { title: 'Get club member list', description: 'Member roster for a club.', inputSchema: { tag: tagFor('Club') } },
    async ({ tag }) => json(await get(`/clubs/${encodeTag(tag)}/members`))
  );

  server.registerTool(
    'bs_get_rankings',
    {
      title: 'Get player or club rankings',
      description: 'Leaderboard rankings by country code ("global" for worldwide).',
      inputSchema: {
        countryCode: z
          .string()
          .default('global')
          .describe('Two-letter ISO 3166-1 alpha-2 country code (e.g. "CA", "US"), or "global" for worldwide. Defaults to "global".'),
        type: z.enum(['players', 'clubs']).default('players').describe('Which leaderboard to return. Defaults to "players".'),
      },
    },
    async ({ countryCode, type }) => json(await get(`/rankings/${countryCode}/${type}`))
  );
}

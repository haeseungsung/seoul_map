import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.json({
    hasMapboxToken: !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    hasSeoulApiKey: !!process.env.NEXT_PUBLIC_SEOUL_API_KEY,
    hasVworldApiKey: !!process.env.NEXT_PUBLIC_VWORLD_API_KEY,
    mapboxTokenLength: process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.length || 0,
    seoulApiKeyLength: process.env.NEXT_PUBLIC_SEOUL_API_KEY?.length || 0,
    vworldApiKeyLength: process.env.NEXT_PUBLIC_VWORLD_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  });
}

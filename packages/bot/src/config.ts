import { pino } from 'pino';

// Environment variables
export const config = {
  twitter: {
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
  },
  bot: {
    userId: process.env.BOT_USER_ID || '',
    allowedUserIds: (process.env.ALLOWED_USER_IDS || '').split(',').filter(Boolean),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '60000', 10),
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
  },
};

export function validateConfig(): void {
  const required = [
    ['TWITTER_API_KEY', config.twitter.apiKey],
    ['TWITTER_API_SECRET', config.twitter.apiSecret],
    ['TWITTER_ACCESS_TOKEN', config.twitter.accessToken],
    ['TWITTER_ACCESS_SECRET', config.twitter.accessSecret],
    ['BOT_USER_ID', config.bot.userId],
    ['GOOGLE_API_KEY', config.google.apiKey],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Logger
export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

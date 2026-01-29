import { TwitterApi } from 'twitter-api-v2';
import { config, logger } from '../config.js';

let client: TwitterApi | null = null;

export function getTwitterClient(): TwitterApi {
  if (!client) {
    client = new TwitterApi({
      appKey: config.twitter.apiKey,
      appSecret: config.twitter.apiSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessSecret,
    });
    logger.info('Twitter client initialized');
  }
  return client;
}

export function getReadOnlyClient() {
  return getTwitterClient().readOnly;
}

export function getReadWriteClient() {
  return getTwitterClient().readWrite;
}

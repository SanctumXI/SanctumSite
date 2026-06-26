import { getAppUrl, getNewsConfig } from '../../config/auth.js';
import { htmlToText } from './sanitize-news.js';

// Mirror a freshly posted news item to the configured Discord webhook.
// No-op (returns false) when no webhook URL is set. Never throws — a webhook
// failure must not fail the news post itself; the caller logs the outcome.
export async function mirrorNewsToDiscord(newsItem) {
  const { webhookUrl } = getNewsConfig();
  if (!webhookUrl) {
    return false;
  }

  const url = `${getAppUrl()}/?view=news&id=${newsItem.id}`;
  // Body is sanitized HTML; Discord embeds want plain text.
  const text = htmlToText(newsItem.body);
  const description = text.length > 4000 ? `${text.slice(0, 3997)}...` : text;

  const payload = {
    embeds: [
      {
        title: newsItem.title.slice(0, 256),
        description,
        url,
        timestamp: new Date(newsItem.publishedAt).toISOString(),
        footer: newsItem.authorName ? { text: `Posted by ${newsItem.authorName}` } : undefined,
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook responded ${response.status}`);
  }

  return true;
}

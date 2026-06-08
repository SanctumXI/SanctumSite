import { getWikiSource } from '../../config/wiki-sources.js';

const DEFAULT_DELAY_MS = Number(process.env.WIKI_API_DELAY_MS ?? 250);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MediaWikiClient {
  constructor(sourceId, options = {}) {
    this.source = getWikiSource(sourceId);
    this.delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
    this.userAgent = options.userAgent ?? 'SanctumSite/0.1 (FFXI wiki aggregator)';
  }

  async api(params) {
    await sleep(this.delayMs);

    const url = new URL(this.source.apiUrl);
    url.searchParams.set('format', 'json');
    url.searchParams.set('formatversion', '2');

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': this.userAgent },
    });

    if (!response.ok) {
      throw new Error(`${this.source.id} API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`${this.source.id} API error: ${data.error.info ?? data.error.code}`);
    }

    return data;
  }

  async *paginate(listKey, params, resultKey) {
    let continueToken;

    do {
      const data = await this.api({
        action: 'query',
        ...params,
        ...(continueToken ? { continue: continueToken.continue, [`${listKey}continue`]: continueToken[`${listKey}continue`] } : {}),
      });

      const batch = data.query?.[resultKey] ?? [];
      yield batch;

      continueToken = data.continue;
    } while (continueToken);
  }

  async search(query, limit = 10) {
    const data = await this.api({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: limit,
      srnamespace: 0,
    });

    return (data.query?.search ?? []).map((result) => result.title);
  }

  async pageExists(title) {
    const data = await this.api({
      action: 'query',
      titles: title,
    });

    const page = data.query?.pages?.[0];
    return Boolean(page && !page.missing);
  }

  async getCategoryMembers(categoryTitle, options = {}) {
    const members = [];

    for await (const batch of this.paginate('cm', {
      list: 'categorymembers',
      cmtitle: categoryTitle,
      cmlimit: 500,
      ...(options.memberType ? { cmtype: options.memberType } : {}),
    }, 'categorymembers')) {
      members.push(...batch);
    }

    return members;
  }

  async getParsedPage(title) {
    const data = await this.api({
      action: 'query',
      titles: title,
      prop: 'revisions|categories',
      rvprop: 'content',
      rvslots: 'main',
      cllimit: 'max',
    });

    const page = data.query?.pages?.[0];
    if (!page || page.missing) {
      return null;
    }

    const revision = page.revisions?.[0];
    const wikitext = revision?.slots?.main?.content ?? '';
    const categories = (page.categories ?? []).map((category) => category.title);

    const parsed = await this.api({
      action: 'parse',
      page: page.title,
      prop: 'text',
    });

    return {
      title: page.title,
      wikitext,
      categories,
      html: parsed.parse?.text ?? '',
    };
  }
}

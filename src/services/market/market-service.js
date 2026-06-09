import { query } from '../../config/database.js';
import { resolveItemByName } from './item-lookup.js';

function formatUnixDate(seconds) {
  if (!seconds) {
    return '—';
  }
  return new Date(Number(seconds) * 1000).toLocaleString();
}

export async function getMarketSummaryForName(name) {
  const item = await resolveItemByName(name);
  if (!item) {
    return { found: false };
  }

  const listings = await getMarketListings(item.itemId);
  const hasListings = listings.auctionHouse.active.length > 0
    || listings.auctionHouse.history.length > 0
    || listings.bazaar.length > 0;

  return {
    found: true,
    hasListings,
    itemId: item.itemId,
    itemName: item.name,
    counts: {
      auctionActive: listings.auctionHouse.active.length,
      auctionHistory: listings.auctionHouse.history.length,
      bazaar: listings.bazaar.length,
    },
  };
}

export async function getMarketListings(itemId) {
  const [activeRows, historyRows, bazaarRows] = await Promise.all([
    query(
      `SELECT seller_name AS sellerName, price, stack
       FROM auction_house
       WHERE itemid = ?
         AND (buyer_name IS NULL OR buyer_name = '')
         AND price > 0
       ORDER BY price ASC
       LIMIT 100`,
      [itemId],
    ),
    query(
      `SELECT seller_name AS sellerName, buyer_name AS buyerName,
              sale, sell_date AS sellDate, stack
       FROM auction_house
       WHERE itemid = ?
         AND sale > 0
         AND sell_date > 0
       ORDER BY sell_date DESC
       LIMIT 50`,
      [itemId],
    ),
    query(
      `SELECT c.charname AS sellerName, ci.quantity, ci.bazaar AS price
       FROM char_inventory ci
       INNER JOIN chars c ON c.charid = ci.charid
       WHERE ci.itemId = ?
         AND ci.bazaar > 0
       ORDER BY ci.bazaar ASC
       LIMIT 100`,
      [itemId],
    ),
  ]);

  return {
    auctionHouse: {
      active: activeRows.map((row) => ({
        sellerName: row.sellerName ?? '—',
        price: row.price,
        stack: Boolean(row.stack),
        stackLabel: row.stack ? 'Stack' : 'Single',
      })),
      history: historyRows.map((row) => ({
        sellerName: row.sellerName ?? '—',
        buyerName: row.buyerName ?? '—',
        sale: row.sale,
        sellDate: row.sellDate,
        sellDateLabel: formatUnixDate(row.sellDate),
        stack: Boolean(row.stack),
        stackLabel: row.stack ? 'Stack' : 'Single',
      })),
    },
    bazaar: bazaarRows.map((row) => ({
      sellerName: row.sellerName ?? '—',
      quantity: row.quantity,
      price: row.price,
    })),
  };
}

export async function getMarketPageData(name) {
  const item = await resolveItemByName(name);
  if (!item) {
    return null;
  }

  const listings = await getMarketListings(item.itemId);

  return {
    itemId: item.itemId,
    itemName: item.name,
    listings,
  };
}

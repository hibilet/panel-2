/**
 * Builds the master system prompt for the sale event generation chatbot.
 * Injects venues, agreements, and providers from context.
 *
 * @param {Object} context
 * @param {Array<{id: string, name: string}>} [context.venues]
 * @param {Array<{id: string, name: string}>} [context.agreements]
 * @param {Array<{id: string, name: string}>} [context.providers]
 * @returns {string} The complete master prompt
 */
export function saleMasterPrompt(context = {}) {
  const { venues = [], agreements = [], providers = [] } = context;

  const v = venues.map(x => `${x.name}|${x.id}`).join('~');
  const a = agreements.map(x => `${x.name}|${x.id}`).join('~');
  const p = providers.map(x => `${x.name ?? x.id}|${x.id}`).join('~');

  return `Role: API Matrix Gen. Output: JSON Array Only.
V:${v}
A:${a}
P:${p}

Format: [VenueCreation|null, [SaleMatrix]]

VenueCreation: [name, address(STREET NR, POST CITY, ISO-CODE), type]

SaleIdx: 0:start, 1:end, 2:stop, 3:minAge, 4:vID, 5:aID, 6:pID, 7:name, 8:cat
ProdIdx: 0:stock, 1:name, 2:price, 3:order
ChanIdx: 0:name

Rule: If venue name from user isn't in V, fill VenueCreation. Else, first element is null.`;
}
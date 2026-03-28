const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const isLikelyObjectId = (value) =>
	typeof value === "string" && OBJECT_ID_RE.test(value.trim());

const mapVenueRow = (venue) => ({
	name: venue[0],
	address: venue[1],
	type: venue[2],
});

const mapSaleRow = (sale) => ({
	name: sale[0],
	start: sale[1],
	end: sale[2],
	venue: sale[3],
	agreement: sale[4],
	provider: sale[5],
	tickets: sale[6],
});

/** Nested array shape from AI: [[venues[]], [sales[]], [linkTitle, linkDesc]] */
const hydrateNestedProgramme = (data) => {
	const [[venuesToCreate, salesToCreate, linksToCreate]] = data;
	const venues = (venuesToCreate ?? []).map(mapVenueRow);
	const sales = (salesToCreate ?? []).map(mapSaleRow);
	const links = linksToCreate
		? [
				{
					name: linksToCreate[0],
					url: linksToCreate[1],
					sales: [],
				},
			]
		: [];
	return { venues, sales, links };
};

/** Plain object shape from API / fixtures: { venues, sales, links } */
const hydrateObjectProgramme = (data) => {
	const venues = (data.venues ?? []).map((v) => ({
		name: v.name,
		address: v.address ?? "",
		type: v.type ?? "other",
	}));
	const sales = (data.sales ?? []).map((s) => ({
		name: s.name,
		start: s.start,
		end: s.end,
		venue: s.venue,
		agreement: s.agreement,
		provider: s.provider,
		tickets: s.tickets ?? [],
	}));
	const links = (data.links ?? []).map((l) => ({
		name: l.name,
		url: l.url ?? "",
		sales: Array.isArray(l.sales) ? l.sales : [],
	}));
	return { venues, sales, links };
};

/**
 * Normalizes AI or fixture payloads into { venues, sales, links }.
 * Links get `sales` filled later with created sale IDs when running the queue.
 */
const normalizeSaleProgramme = (raw) => {
	if (raw == null) return { venues: [], sales: [], links: [] };
	const data = raw?.data ?? raw;
	if (
		data !== null &&
		typeof data === "object" &&
		!Array.isArray(data) &&
		(data.venues || data.sales || data.links)
	) {
		return hydrateObjectProgramme(data);
	}
	if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
		return hydrateNestedProgramme(data);
	}
	return { venues: [], sales: [], links: [] };
};

/**
 * Resolves venue reference for a sale: Mongo id string stays; numeric index
 * maps to `createdVenueIds[index]` after venues are created in order.
 */
const resolveVenueId = (venueRef, createdVenueIds) => {
	if (isLikelyObjectId(venueRef)) return venueRef.trim();
	const idx =
		typeof venueRef === "number"
			? venueRef
			: typeof venueRef === "string" && /^\d+$/.test(venueRef)
				? Number(venueRef)
				: NaN;
	if (!Number.isFinite(idx) || idx < 0 || idx >= createdVenueIds.length) {
		throw new Error(
			`Invalid venue reference ${venueRef}: need existing id or index 0..${createdVenueIds.length - 1}`,
		);
	}
	const id = createdVenueIds[idx];
	if (!id) {
		throw new Error(`Venue index ${idx} has not been created yet`);
	}
	return id;
};

const venueTypeToCategory = (type) => {
	const key = String(type ?? "")
		.toLowerCase()
		.trim();
	const map = {
		"concert hall": "event-hall",
		"event hall": "event-hall",
		club: "club",
		theater: "theater",
		arena: "arena",
		stadium: "stadium",
	};
	return map[key] ?? "other";
};

export {
	isLikelyObjectId,
	normalizeSaleProgramme,
	resolveVenueId,
	venueTypeToCategory,
};

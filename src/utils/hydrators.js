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

const tryHydrateNested = (value) => {
	if (!Array.isArray(value) || value.length === 0 || !Array.isArray(value[0])) {
		return null;
	}
	try {
		return hydrateNestedProgramme(value);
	} catch {
		return null;
	}
};

/**
 * Normalizes AI or fixture payloads into { venues, sales, links }.
 * Links get `sales` filled later with created sale IDs when running the queue.
 *
 * Handles:
 * - Nested array: [[[venues],[sales],[linkTitle,linkDesc]]] (fixtures / parsed)
 * - Plain { venues, sales, links }
 * - /ai/sales envelope: { data: { parsed: [...], message: "[...]" , data: { context } } }
 */
const normalizeSaleProgramme = (raw) => {
	if (raw == null) return { venues: [], sales: [], links: [] };

	const nestedFrom = tryHydrateNested(raw);
	if (
		nestedFrom &&
		(nestedFrom.venues.length ||
			nestedFrom.sales.length ||
			nestedFrom.links.length)
	) {
		return nestedFrom;
	}

	const layer = raw?.data ?? raw;

	if (layer?.parsed != null) {
		const fromParsed = tryHydrateNested(layer.parsed);
		if (
			fromParsed &&
			(fromParsed.venues.length ||
				fromParsed.sales.length ||
				fromParsed.links.length)
		) {
			return fromParsed;
		}
	}

	if (typeof layer?.message === "string") {
		const trimmed = layer.message.trim();
		if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
			try {
				const decoded = JSON.parse(trimmed);
				const fromMsg = tryHydrateNested(decoded);
				if (
					fromMsg &&
					(fromMsg.venues.length ||
						fromMsg.sales.length ||
						fromMsg.links.length)
				) {
					return fromMsg;
				}
			} catch {
				// ignore
			}
		}
	}

	/* Some APIs nest context under data.data; programme is still on layer.parsed above */
	const inner = layer?.data;
	if (inner?.parsed != null) {
		const fromInner = tryHydrateNested(inner.parsed);
		if (
			fromInner &&
			(fromInner.venues.length ||
				fromInner.sales.length ||
				fromInner.links.length)
		) {
			return fromInner;
		}
	}

	if (
		layer !== null &&
		typeof layer === "object" &&
		!Array.isArray(layer) &&
		(layer.venues || layer.sales || layer.links)
	) {
		/* Skip API "context" blobs: venues are only { id, name }, no programme sales */
		const v = layer.venues;
		const looksLikeContextOnly =
			Array.isArray(v) &&
			v.length > 0 &&
			v.every(
				(x) =>
					x &&
					typeof x === "object" &&
					"id" in x &&
					!("address" in x) &&
					!("type" in x),
			) &&
			!layer.sales?.length;
		if (!looksLikeContextOnly) {
			return hydrateObjectProgramme(layer);
		}
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

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { postSilent } from "../lib/client";
import {
	isLikelyObjectId,
	normalizeSaleProgramme,
	resolveVenueId,
	venueTypeToCategory,
} from "../utils/hydrators";
import { slugify } from "../utils/strings";

dayjs.extend(utc);

export const SALE_IMPORT_REQUEST_GAP_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates venues, sales, ticket products, and links from a normalized or raw AI payload.
 *
 * @param {unknown} rawData - API response or fixture (nested array or { venues, sales, links }).
 * @param {object} options
 * @param {number} [options.requestGapMs]
 * @param {() => Promise<void>} [options.refreshSales]
 * @param {(phase: string) => void} options.onPhase - 'venues' | 'events' | 'links' | 'done' | 'error'
 * @param {(meta: { venuesTotal: number, salesTotal: number, linksTotal: number, grandTotal: number, ticketPosts: number, saleCount: number }) => void} options.onInitProgress
 * @param {() => void} options.onVenueStep - after each venue POST
 * @param {() => void} options.onSaleStep - after each sale POST
 * @param {() => void} options.onTicketStep - after each product POST
 * @param {() => void} options.onLinkStep - after each link POST
 * @param {(text: string, kind?: 'info'|'error') => void} options.onLog
 */
export async function runSaleProgrammeImport(rawData, options) {
	const {
		requestGapMs = SALE_IMPORT_REQUEST_GAP_MS,
		refreshSales,
		onPhase,
		onInitProgress,
		onVenueStep,
		onSaleStep,
		onTicketStep,
		onLinkStep,
		onLog,
	} = options;

	const normalized = normalizeSaleProgramme(rawData);
	const { venues, sales, links } = normalized;

	const ticketPosts = sales.reduce(
		(acc, s) => acc + (s.tickets?.length ?? 0),
		0,
	);
	const linkCount = links.length;
	const vTotal = venues.length;
	const saleCount = sales.length;
	const grandTotal = vTotal + saleCount + ticketPosts + linkCount;

	onInitProgress({
		venuesTotal: vTotal,
		salesTotal: saleCount,
		linksTotal: linkCount,
		grandTotal,
		ticketPosts,
		saleCount,
	});

	const createdVenueIds = [];
	const createdSaleIds = [];

	onPhase("venues");
	onLog(
		`Starting import: ${vTotal} venue(s), ${saleCount} event(s), ${linkCount} link(s), ${ticketPosts} ticket type(s).`,
		"info",
	);

	for (let i = 0; i < venues.length; i++) {
		const v = venues[i];
		onLog(`Creating venue "${v.name}"…`, "info");
		const payload = {
			name: v.name,
			address: v.address || undefined,
			category: venueTypeToCategory(v.type),
			status: "active",
		};
		const res = await postSilent("/venues", payload);
		const created = res.data ?? res;
		const vid = created?.id ?? created?._id;
		if (!vid) {
			throw new Error(`Venue created but no id returned for "${v.name}"`);
		}
		createdVenueIds.push(vid);
		onVenueStep();
		onLog(`Venue ready: ${v.name} (${vid}).`, "info");
		await sleep(requestGapMs);
	}

	onPhase("events");
	for (const sale of sales) {
		const venueId = resolveVenueId(sale.venue, createdVenueIds);
		onLog(`Creating event "${sale.name}"…`, "info");
		const salePayload = {
			name: sale.name,
			start: dayjs(sale.start).format("YYYY-MM-DD HH:mm"),
			end: dayjs(sale.end).format("YYYY-MM-DD HH:mm"),
			stopSaleAt: dayjs(sale.end).format("YYYY-MM-DD HH:mm"),
			rules: "~",
			venue: venueId,
			agreement: sale.agreement,
			provider: sale.provider,
			currency: "eur",
			category: "tour",
			type: "sale.event",
		};
		const saleRes = await postSilent("/sales", salePayload);
		const saleRow = saleRes.data ?? saleRes;
		const saleId = saleRow?.id ?? saleRow?._id;
		if (!saleId) {
			throw new Error(`Sale created but no id for "${sale.name}"`);
		}
		createdSaleIds.push(saleId);
		onSaleStep();
		onLog(`Event live: ${sale.name}.`, "info");
		await sleep(requestGapMs);

		const tickets = sale.tickets ?? [];
		for (const t of tickets) {
			const [tName, price, stock] = t;
			onLog(`Adding ticket "${tName}" to ${sale.name}…`, "info");
			await postSilent("/products", {
				sale: saleId,
				type: "product.event",
				name: tName,
				price: Number(price),
				stock: Number(stock),
				status: "active",
			});
			onTicketStep();
			onLog(`Ticket "${tName}" added.`, "info");
			await sleep(requestGapMs);
		}
	}

	onPhase("links");
	const saleIdsForLinks =
		createdSaleIds.length > 0
			? createdSaleIds
			: links.flatMap((l) => l.sales ?? []);

	for (let i = 0; i < links.length; i++) {
		const link = links[i];
		const linkSaleIds =
			Array.isArray(link.sales) &&
			link.sales.length > 0 &&
			link.sales.every((x) => isLikelyObjectId(String(x)))
				? link.sales
				: saleIdsForLinks;

		onLog(
			`Creating link "${link.name}" with ${linkSaleIds.length} event(s)…`,
			"info",
		);
		await postSilent("/links", {
			title: link.name,
			image: `https://placeholdit.com/1000x1000/dddddd/999999?text=${link.name}`,
			slug: slugify(link.name),
			description: link.url || undefined,
			sales: linkSaleIds,
		});
		onLinkStep();
		onLog(`Link "${link.name}" saved.`, "info");
		await sleep(requestGapMs);
	}

	onPhase("done");
	onLog("Import finished successfully.", "info");
	await refreshSales?.();
}

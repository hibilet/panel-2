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

/** Snapshot for resume after a failed POST. */
export function cloneImportCheckpoint(source) {
	if (!source) {
		return {
			createdVenueIds: [],
			createdSaleIds: [],
			completedFullSales: 0,
			midSale: null,
			linksCompleted: 0,
			pendingVenueMessageId: null,
			pendingEventMessageId: null,
			pendingLinkMessageId: null,
		};
	}
	return {
		createdVenueIds: [...(source.createdVenueIds ?? [])],
		createdSaleIds: [...(source.createdSaleIds ?? [])],
		completedFullSales: source.completedFullSales ?? 0,
		midSale: source.midSale
			? {
					saleIndex: source.midSale.saleIndex,
					phase: source.midSale.phase,
					eventMessageId: source.midSale.eventMessageId,
					saleId: source.midSale.saleId ?? null,
					ticketsPosted: source.midSale.ticketsPosted ?? 0,
				}
			: null,
		linksCompleted: source.linksCompleted ?? 0,
		pendingVenueMessageId: source.pendingVenueMessageId ?? null,
		pendingEventMessageId: source.pendingEventMessageId ?? null,
		pendingLinkMessageId: source.pendingLinkMessageId ?? null,
	};
}

function emitCheckpoint(onCheckpoint, cp) {
	onCheckpoint?.(cloneImportCheckpoint(cp));
}

/**
 * @typedef {object} SaleImportUiHooks
 * @property {(name: string) => string | undefined | void} [venueStart]
 * @property {(msgId: string, payload: { id: string, name: string }) => void} [venueDone]
 * @property {(name: string, max: number) => string | undefined | void} [eventStart]
 * @property {(msgId: string, payload: { value: number, max: number, sublabel: string }) => void} [eventProgress]
 * @property {(msgId: string, payload: { id: string, name: string, max: number }) => void} [eventDone]
 * @property {(name: string) => string | undefined | void} [linkStart]
 * @property {(msgId: string, payload: { id: string, name: string }) => void} [linkDone]
 * @property {(text: string, kind?: 'info'|'error') => void} [onLog]
 */

/**
 * @param {unknown} rawData
 * @param {object} options
 * @param {number} [options.requestGapMs]
 * @param {() => Promise<void>} [options.refreshSales]
 * @param {SaleImportUiHooks} [options.ui]
 * @param {ReturnType<typeof cloneImportCheckpoint>} [options.resume]
 * @param {(cp: ReturnType<typeof cloneImportCheckpoint>) => void} [options.onCheckpoint]
 */
export async function runSaleProgrammeImport(rawData, options) {
	const {
		requestGapMs = SALE_IMPORT_REQUEST_GAP_MS,
		refreshSales,
		ui = {},
		resume,
		onCheckpoint,
	} = options;
	const {
		venueStart,
		venueDone,
		eventStart,
		eventProgress,
		eventDone,
		linkStart,
		linkDone,
		onLog,
	} = ui;

	const normalized = normalizeSaleProgramme(rawData);
	const { venues, sales, links } = normalized;

	const linkCount = links.length;
	const vTotal = venues.length;
	const saleCount = sales.length;
	/** Multi-event “tour” links only; one event → open the sale directly */
	const skipLinks = saleCount <= 1;

	const cp = cloneImportCheckpoint(resume);

	if (!resume) {
		const linkPart = skipLinks
			? "no link (single event)"
			: `${linkCount} link(s)`;
		onLog?.(
			`Starting import: ${vTotal} venue(s), ${saleCount} event(s), ${linkPart}.`,
			"info",
		);
	} else {
		onLog?.("Resuming import from last checkpoint…", "info");
	}

	const createdVenueIds = cp.createdVenueIds;
	const createdSaleIds = cp.createdSaleIds;

	// —— Venues ——
	for (let i = createdVenueIds.length; i < venues.length; i++) {
		const v = venues[i];
		let msgId;
		if (cp.pendingVenueMessageId != null && i === createdVenueIds.length) {
			msgId = cp.pendingVenueMessageId;
		} else {
			msgId = venueStart?.(v.name) ?? null;
			cp.pendingVenueMessageId = msgId;
			emitCheckpoint(onCheckpoint, cp);
		}

		const res = await postSilent("/venues", {
			name: v.name,
			address: v.address || undefined,
			category: venueTypeToCategory(v.type),
			status: "active",
		});
		const created = res.data ?? res;
		const vid = created?.id ?? created?._id;
		if (!vid) {
			emitCheckpoint(onCheckpoint, cp);
			throw new Error(`Venue created but no id returned for "${v.name}"`);
		}
		createdVenueIds.push(vid);
		cp.pendingVenueMessageId = null;
		if (msgId) {
			venueDone?.(msgId, { id: vid, name: v.name });
		}
		emitCheckpoint(onCheckpoint, cp);
		await sleep(requestGapMs);
	}

	// —— Mid-sale resume (tickets only, or finish sale POST) ——
	if (cp.midSale) {
		const ms = cp.midSale;
		const sale = sales[ms.saleIndex];
		const tickets = sale.tickets ?? [];
		const max = 1 + tickets.length;
		const msgId = ms.eventMessageId ?? cp.pendingEventMessageId;

		if (ms.phase === "sale") {
			const venueId = resolveVenueId(sale.venue, createdVenueIds);
			if (msgId) {
				eventProgress?.(msgId, {
					value: 0,
					max,
					sublabel: "Creating event…",
				});
			}
			const saleRes = await postSilent("/sales", {
				name: sale.name,
				start: dayjs(sale.start).format("YYYY-MM-DD HH:mm"),
				end: dayjs(sale.end).format("YYYY-MM-DD HH:mm"),
				stopSaleAt: dayjs(sale.end).format("YYYY-MM-DD HH:mm"),
				rules: "~",
				venue: venueId,
				agreement: sale.agreement,
				...(sale.provider != null && sale.provider !== ""
					? { provider: sale.provider }
					: {}),
				currency: "eur",
				category: "tour",
				type: "sale.event",
			});
			const saleRow = saleRes.data ?? saleRes;
			const saleId = saleRow?.id ?? saleRow?._id;
			if (!saleId) {
				emitCheckpoint(onCheckpoint, cp);
				throw new Error(`Sale created but no id for "${sale.name}"`);
			}
			ms.phase = "tickets";
			ms.saleId = saleId;
			ms.ticketsPosted = 0;
			cp.pendingEventMessageId = msgId;
			emitCheckpoint(onCheckpoint, cp);
			if (msgId) {
				const tc = tickets.length;
				eventProgress?.(msgId, {
					value: 1,
					max,
					sublabel: tc > 0 ? `Adding tickets (1/${tc})…` : "Finishing…",
				});
			}
			await sleep(requestGapMs);
		}

		if (ms.phase === "tickets" && ms.saleId) {
			const saleId = ms.saleId;
			for (let ti = ms.ticketsPosted; ti < tickets.length; ti++) {
				const t = tickets[ti];
				const [tName, price, stock] = t;
				if (msgId) {
					eventProgress?.(msgId, {
						value: 1 + ti,
						max,
						sublabel: `Adding tickets (${ti + 1}/${tickets.length})…`,
					});
				}
				await postSilent("/products", {
					sale: saleId,
					type: "product.event",
					name: tName,
					price: Number(price),
					stock: Number(stock),
					status: "active",
				});
				ms.ticketsPosted = ti + 1;
				emitCheckpoint(onCheckpoint, cp);
				if (msgId) {
					const n = tickets.length;
					const doneValue = 2 + ti;
					eventProgress?.(msgId, {
						value: doneValue,
						max,
						sublabel: ti + 1 < n ? `Adding tickets (${ti + 2}/${n})…` : "Done",
					});
				}
				await sleep(requestGapMs);
			}
			if (msgId) {
				eventProgress?.(msgId, { value: max, max, sublabel: "Done" });
				eventDone?.(msgId, { id: saleId, name: sale.name, max });
			}
			createdSaleIds.push(saleId);
			cp.completedFullSales = ms.saleIndex + 1;
			cp.midSale = null;
			cp.pendingEventMessageId = null;
			emitCheckpoint(onCheckpoint, cp);
			await sleep(requestGapMs);
		}
	}

	// —— Sales (remaining) ——
	for (let s = cp.completedFullSales; s < sales.length; s++) {
		const sale = sales[s];
		const venueId = resolveVenueId(sale.venue, createdVenueIds);
		const tickets = sale.tickets ?? [];
		const max = 1 + tickets.length;
		const msgId = eventStart?.(sale.name, max) ?? null;
		cp.pendingEventMessageId = msgId;
		cp.midSale = {
			saleIndex: s,
			phase: "sale",
			eventMessageId: msgId,
			saleId: null,
			ticketsPosted: 0,
		};
		emitCheckpoint(onCheckpoint, cp);

		if (msgId) {
			eventProgress?.(msgId, {
				value: 0,
				max,
				sublabel: "Creating event…",
			});
		}

		const saleRes = await postSilent("/sales", {
			name: sale.name,
			start: dayjs(sale.start).format("YYYY-MM-DD HH:mm"),
			end: dayjs(sale.end).format("YYYY-MM-DD HH:mm"),
			stopSaleAt: dayjs(sale.end).format("YYYY-MM-DD HH:mm"),
			rules: "~",
			venue: venueId,
			agreement: sale.agreement,
			...(sale.provider != null && sale.provider !== ""
				? { provider: sale.provider }
				: {}),
			currency: "eur",
			category: "tour",
			type: "sale.event",
		});
		const saleRow = saleRes.data ?? saleRes;
		const saleId = saleRow?.id ?? saleRow?._id;
		if (!saleId) {
			emitCheckpoint(onCheckpoint, cp);
			throw new Error(`Sale created but no id for "${sale.name}"`);
		}

		cp.midSale = {
			saleIndex: s,
			phase: "tickets",
			eventMessageId: msgId,
			saleId,
			ticketsPosted: 0,
		};
		emitCheckpoint(onCheckpoint, cp);

		if (msgId) {
			const tc = tickets.length;
			eventProgress?.(msgId, {
				value: 1,
				max,
				sublabel: tc > 0 ? `Adding tickets (1/${tc})…` : "Finishing…",
			});
		}
		await sleep(requestGapMs);

		for (let ti = 0; ti < tickets.length; ti++) {
			const t = tickets[ti];
			const [tName, price, stock] = t;
			if (msgId) {
				eventProgress?.(msgId, {
					value: 1 + ti,
					max,
					sublabel: `Adding tickets (${ti + 1}/${tickets.length})…`,
				});
			}
			await postSilent("/products", {
				sale: saleId,
				type: "product.event",
				name: tName,
				price: Number(price),
				stock: Number(stock),
				status: "active",
			});
			if (msgId) {
				const n = tickets.length;
				const doneValue = 2 + ti;
				eventProgress?.(msgId, {
					value: doneValue,
					max,
					sublabel: ti + 1 < n ? `Adding tickets (${ti + 2}/${n})…` : "Done",
				});
			}
			cp.midSale.ticketsPosted = ti + 1;
			emitCheckpoint(onCheckpoint, cp);
			await sleep(requestGapMs);
		}

		if (msgId) {
			eventProgress?.(msgId, { value: max, max, sublabel: "Done" });
			eventDone?.(msgId, { id: saleId, name: sale.name, max });
		}
		createdSaleIds.push(saleId);
		cp.completedFullSales = s + 1;
		cp.midSale = null;
		cp.pendingEventMessageId = null;
		emitCheckpoint(onCheckpoint, cp);
		await sleep(requestGapMs);
	}

	if (!skipLinks) {
		const saleIdsForLinks =
			createdSaleIds.length > 0
				? createdSaleIds
				: links.flatMap((l) => l.sales ?? []);

		for (let li = cp.linksCompleted; li < links.length; li++) {
			const link = links[li];
			const linkSaleIds =
				Array.isArray(link.sales) &&
				link.sales.length > 0 &&
				link.sales.every((x) => isLikelyObjectId(String(x)))
					? link.sales
					: saleIdsForLinks;

			let msgId;
			if (cp.pendingLinkMessageId != null && li === cp.linksCompleted) {
				msgId = cp.pendingLinkMessageId;
			} else {
				msgId = linkStart?.(link.name) ?? null;
				cp.pendingLinkMessageId = msgId;
				emitCheckpoint(onCheckpoint, cp);
			}

			const linkRes = await postSilent("/links", {
				title: link.name,
				image: `https://placeholdit.com/1000x1000/dddddd/999999?text=${encodeURIComponent(link.name)}`,
				slug: `${slugify(link.name)}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				description: link.url || undefined,
				sales: linkSaleIds,
			});
			const linkRow = linkRes.data ?? linkRes;
			const linkId = linkRow?.id ?? linkRow?._id;
			if (!linkId) {
				emitCheckpoint(onCheckpoint, cp);
				throw new Error(`Link created but no id for "${link.name}"`);
			}
			cp.linksCompleted = li + 1;
			cp.pendingLinkMessageId = null;
			if (msgId) {
				linkDone?.(msgId, { id: linkId, name: link.name });
			}
			emitCheckpoint(onCheckpoint, cp);
			await sleep(requestGapMs);
		}
	}

	onLog?.("Import finished successfully.", "info");
	await refreshSales?.();
}

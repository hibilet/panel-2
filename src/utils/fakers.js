import {
	rand,
	randBetweenDate,
	randCity,
	randParagraph,
	randSuperheroName,
} from "@ngneat/falso";
import dayjs from "dayjs";

/**
 * Generates fake sale basic data for form filling.
 * @param {{ venues?: Array<{ id: string }> }} [options] - Options. Pass venues to pick a random venue.
 * @returns {Object} Sale basic form data
 */
export function saleBasicFaker(options = {}) {
	const { venues = [] } = options;

	const from = dayjs().add(1, "week").toDate();
	const to = dayjs().add(1, "year").toDate();
	const startDate = randBetweenDate({ from, to });
	const start = dayjs(startDate)
		.hour(19 + Math.floor(Math.random() * 4))
		.minute(0)
		.second(0)
		.millisecond(0);
	const end = start.add(4, "hour");
	const stopSaleAt = start.add(1, "hour");

	const venueOptions = venues?.length ? venues : [];
	const venue = venueOptions.length ? rand(venueOptions).id : "";

	return {
		name: `${randSuperheroName()} - ${randCity()}`,
		start: start.format("YYYY-MM-DDTHH:mm"),
		end: end.format("YYYY-MM-DDTHH:mm"),
		stopSaleAt: stopSaleAt.format("YYYY-MM-DDTHH:mm"),
		rules: randParagraph(),
    minAge: Math.floor(Math.random() * 6) + 12,
		venue,
	};
}

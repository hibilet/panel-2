import { canSeeMoney } from "./capabilities";

/**
 * The signed-in account, as a module value.
 *
 * Money is formatted in ~62 places, many of them inside table column factories
 * and chart tick callbacks - plain data and plain functions with no React
 * context to read. Publishing the viewer once, here, lets the shared currency
 * formatter apply the panel.money permission everywhere at a single point,
 * instead of threading an account argument through every one of those sites and
 * inevitably missing some.
 *
 * Lives in its own module so both localization (the formatter) and lib/money
 * can read it without importing each other.
 */
let viewer = null;

export const setViewer = (account) => {
	viewer = account ?? null;
};

export const getViewer = () => viewer;

/** Whether the current viewer may see monetary figures. */
export const viewerSeesMoney = () => canSeeMoney(viewer);

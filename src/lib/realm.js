const realm = import.meta.env.VITE_REALM ?? null;

export const getRealm = () => realm;

// Domains are the single source of truth for where a realm lives. The public
// URLs the backend uses to build links are just `https://<hostname>` per
// service, so derive them from the domains instead of maintaining a parallel
// set of URL fields. `tickets` and `widget` are the same buyer-facing surface,
// so each falls back to the other.
const withScheme = (host) =>
	/^https?:\/\//.test(host) ? host : `https://${host}`;

export const urlsFromDomains = (domains = []) => {
	const byService = {};
	for (const d of domains) {
		if (d.hostname?.trim()) byService[d.service] = withScheme(d.hostname.trim());
	}
	return {
		api: byService.api,
		dashboard: byService.dashboard,
		widget: byService.widget || byService.tickets,
		tickets: byService.tickets || byService.widget,
	};
};

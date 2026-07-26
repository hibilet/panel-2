const realm = import.meta.env.VITE_REALM ?? null;

export const getRealm = () => realm;

// Domains are the single source of truth for where a realm lives. The public
// URLs the backend uses to build links are just `https://<hostname>` per
// service, so derive them from the domains instead of maintaining a parallel
// set of URL fields. `tickets` and `widget` are the same buyer-facing surface,
// so each falls back to the other.
// localhost / 127.0.0.1 (with any port) has no TLS in dev, so scheme it http;
// everything else is https.
const isLocalHost = (host) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);

const withScheme = (host) => {
	if (/^https?:\/\//.test(host)) return host;
	return `${isLocalHost(host) ? "http" : "https"}://${host}`;
};

// The realm is addressed by five hosts: panel (the dashboard app), api, widget,
// reader and cdn. Public URLs derive from them - `dashboard` from the panel
// host, `tickets` from the widget host (same buyer surface).
export const DOMAIN_SERVICES = ["panel", "api", "widget", "reader", "cdn"];

export const urlsFromDomains = (domains = []) => {
	const byService = {};
	for (const d of domains) {
		if (d.hostname?.trim()) byService[d.service] = withScheme(d.hostname.trim());
	}
	return {
		api: byService.api,
		dashboard: byService.panel || byService.dashboard,
		widget: byService.widget || byService.tickets,
		tickets: byService.tickets || byService.widget,
		cdn: byService.cdn,
	};
};

import { useEffect } from "react";
import { useSearch } from "wouter";
import { setToken } from "../../../lib/storage";
import { showToast } from "../../../lib/toastStore";

// Keep this short list explicit so a malicious `?route=//evil.com` can't
// redirect users off the panel. Maps tokenized names to in-app paths.
const ROUTE_MAP = {
	"settings.providers": "/settings/providers",
	"settings.realm": "/settings/realm",
	"settings.mailing": "/settings/mailing",
	"settings.billing": "/settings/billing",
	settings: "/settings",
	dashboard: "/",
};

const resolveRoute = (raw) => {
	if (!raw) return "/";
	const mapped = ROUTE_MAP[raw];
	if (mapped) return mapped;
	// Allow any in-app path that starts with "/" but isn't protocol-relative.
	if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) return raw;
	return "/";
};

const OAuth = () => {
	const search = useSearch();
	const params = new URLSearchParams(search);
	const token = params.get("token");
	const error = params.get("error");
	const route = resolveRoute(params.get("route"));
	const stripeAttached = params.get("stripe_attached") === "1";
	const stripeRegistered = params.get("stripe_registered") === "1";

	useEffect(() => {
		// Token present -> persist + bounce to target route. Works whether the
		// user was logged in or not before this call.
		if (token) {
			setToken(token);
			if (stripeAttached || stripeRegistered) {
				const next = new URLSearchParams();
				if (stripeAttached) next.set("stripe_attached", "1");
				if (stripeRegistered) next.set("stripe_registered", "1");
				const qs = next.toString();
				window.location.replace(`${route}${qs ? `?${qs}` : ""}`);
			} else {
				window.location.replace(route);
			}
			return;
		}
		// Error path - show toast, return user to where they came from
		// (the route they had open before initiating OAuth) instead of "/".
		if (error) {
			showToast("error", error.replace(/_/g, " "));
			window.location.replace(route);
		}
	}, [token, error, route, stripeAttached, stripeRegistered]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center">
			<i className="fa-solid fa-spinner fa-spin mb-4 text-2xl text-slate-500" aria-hidden />
			<p className="text-slate-600">Logging In</p>
		</div>
	);
};

export default OAuth;

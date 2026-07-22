import strings from "../localization";
import { getRealm } from "./realm";
import { getToken } from "./storage";
import { showToast } from "./toastStore";

const api = import.meta.env.VITE_API_URL;

const headerBuilder = (header, form) => ({
	...{ header },
	...(form ? { "Content-Type": "application/json" } : null),
	...(getToken() ? { authorization: getToken() } : null),
	...(getRealm() ? { "x-realm": getRealm() } : null),
});

let sessionExpiredHandled = false;

const handleSessionExpired = () => {
	if (sessionExpiredHandled) return;
	sessionExpiredHandled = true;
	const message = strings("auth.sessionExpired");
	localStorage.removeItem("token");
	showToast("error", message);
	try {
		sessionStorage.setItem("pendingToast.error", message);
	} catch {}
	setTimeout(() => {
		if (window.location.pathname === "/") {
			window.location.reload();
		} else {
			window.location.replace("/");
		}
	}, 50);
};

const handler = async (res) => {
	if ((res.status === 401 || res.status === 403) && getToken()) {
		const data = await res.json();
		if (res.status === 401 || data?.message === "session-expired") {
			handleSessionExpired();
			const err = new Error("session-expired");
			err.__sessionExpired = true;
			throw err;
		}
		throw data;
	}
	if (!res.ok) {
		throw await res.json();
	}
	return res.json();
};

// The API answers errors as { log, message } where message is a kebab slug
// (eg "cant-mark-read"). Prefer a translated string for it, then the raw slug,
// then a generic fallback - anything beats a blanket "An Error Occurred".
const errorMessage = (err) => {
	const slug = typeof err?.message === "string" ? err.message : null;
	if (!slug) return strings("common.errorOccurred");
	const key = `error.${slug}`;
	const translated = strings(key);
	if (translated !== key) return translated;
	return slug.includes(" ") ? slug : strings("common.errorOccurred");
};

const withToast = (promise) =>
	promise
		.then((data) => {
			showToast("success", strings("common.success"));
			return data;
		})
		.catch((err) => {
			if (!err?.__sessionExpired) showToast("error", errorMessage(err));
			throw err;
		});

const get = (endpoint, header = null) =>
	fetch(api + endpoint, {
		method: "get",
		headers: headerBuilder(header),
	}).then(handler);

const getText = async (endpoint, header = null) => {
	const res = await fetch(api + endpoint, {
		method: "get",
		headers: headerBuilder(header),
	});
	if ((res.status === 401 || res.status === 403) && getToken()) {
		const data = await res.json().catch(() => ({ message: "auth-error" }));
		if (res.status === 401 || data?.message === "session-expired") {
			localStorage.removeItem("token");
			showToast("error", strings("auth.sessionExpired"));
			setTimeout(() => window.location.replace("/"), 50);
			const err = new Error("session-expired");
			err.__sessionExpired = true;
			throw err;
		}
		throw data;
	}
	const text = await res.text();
	if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
	return { text, headers: res.headers };
};

const postForm = (endpoint, formData, header = null) => {
	const headers = headerBuilder(header);
	return fetch(api + endpoint, {
		method: "post",
		body: formData,
		headers,
	}).then(handler);
};

const post = (endpoint, form = null, header = null) =>
	withToast(
		fetch(api + endpoint, {
			method: "post",
			body: JSON.stringify(form),
			headers: headerBuilder(header, form),
		}).then(handler),
	);

const put = (endpoint, form = null, header = null) =>
	withToast(
		fetch(api + endpoint, {
			method: "put",
			body: JSON.stringify(form),
			headers: headerBuilder(header, form),
		}).then(handler),
	);

const del = (endpoint, form = null, header = null) =>
	withToast(
		fetch(api + endpoint, {
			method: "delete",
			body: JSON.stringify(form),
			headers: headerBuilder(header, form),
		}).then(handler),
	);

const patch = (endpoint, form = null, header = null) =>
	withToast(
		fetch(api + endpoint, {
			method: "patch",
			body: JSON.stringify(form),
			headers: headerBuilder(header, form),
		}).then(handler),
	);

export { api as API_BASE_URL, del, get, getText, patch, post, postForm, put };

import strings from "../localization";
import { getToken } from "./storage";
import { showToast } from "./toastStore";

const api = import.meta.env.VITE_API_URL;

const headerBuilder = (header, form) => ({
	...{ header },
	...(form ? { "Content-Type": "application/json" } : null),
	...(getToken() ? { authorization: getToken() } : null),
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

const withToast = (promise) =>
	promise
		.then((data) => {
			showToast("success", "Success");
			return data;
		})
		.catch((err) => {
			if (!err?.__sessionExpired) showToast("error", "An Error Occurred");
			throw err;
		});

const get = (endpoint, header = null) =>
	fetch(api + endpoint, {
		method: "get",
		headers: headerBuilder(header),
	}).then(handler);

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

export { api as API_BASE_URL, del, get, post, put };

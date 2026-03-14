import { getToken } from "./storage";
import { showToast } from "./toastStore";

const api = import.meta.env.VITE_API_URL;

const headerBuilder = (header, form) => ({
	...{ header },
	...(form ? { "Content-Type": "application/json" } : null),
	...(getToken() ? { authorization: getToken() } : null),
});

const handler = async (res) => {
	if (!res.ok) {
		throw await res.json();
	} else {
		return res.json();
	}
};

const withToast = (promise) =>
	promise
		.then((data) => {
			showToast("success", "Success");
			return data;
		})
		.catch((err) => {
			showToast("error", "An Error Occurred");
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

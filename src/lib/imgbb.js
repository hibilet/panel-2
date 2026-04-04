import { getToken } from "./storage";

const api = import.meta.env.VITE_API_URL;

export const uploadImage = async (file) => {
	const form = new FormData();
	form.append("file", file);

	const res = await fetch(`${api}/media`, {
		method: "POST",
		headers: {
			...(getToken() ? { authorization: getToken() } : null),
		},
		body: form,
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err?.message ?? "Image upload failed");
	}

	const json = await res.json();
	return json.data.display_url;
};

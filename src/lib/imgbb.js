const IMGBB_API = "https://api.imgbb.com/1/upload";
const API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

export const uploadImage = async (file) => {
	if (!API_KEY) {
		throw new Error("VITE_IMGBB_API_KEY is not configured");
	}
	const form = new FormData();
	form.append("key", API_KEY);
	form.append("image", file);

	const res = await fetch(IMGBB_API, {
		method: "POST",
		body: form,
	});
	const json = await res.json();
	if (!json.success) {
		throw new Error(json?.error?.message ?? "Image upload failed");
	}
	return json.data.url;
};

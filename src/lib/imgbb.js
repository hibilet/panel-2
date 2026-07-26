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
	// The media pipeline returns { url (original), variants: {original, md, sm} }.
	return json.data?.url ?? json.data?.variants?.original;
};

// jpg/png/webp, 1 MB - mirrors the server cap so the user gets an instant
// error instead of a round-trip rejection.
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 1024 * 1024;

export const enhanceImage = async (linkId) => {
	const res = await fetch(`${api}/media/enhance/${linkId}`, {
		method: "POST",
		headers: {
			...(getToken() ? { authorization: getToken() } : null),
		},
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err?.message ?? "Image enhance failed");
	}

	const json = await res.json();
	return json.data?.url ?? json.data?.variants?.original;
};

export const base64ToBlob = (base64) => {
	const match = /^data:([^;]+);base64,(.*)$/.exec(base64);
	const mime = match ? match[1] : "image/png";
	const raw = match ? match[2] : base64;
	const bytes = atob(raw);
	const buf = new Uint8Array(bytes.length);
	for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
	return new Blob([buf], { type: mime });
};

export const uploadBase64 = async (base64) => {
	const blob = base64ToBlob(base64);
	const ext = blob.type.split("/")[1] || "png";
	const file = new File([blob], `enhanced.${ext}`, { type: blob.type });
	return uploadImage(file);
};

export const normalize = (s) => String(s ?? "").trim().toLowerCase();

export const matchesQuery = (text, q) => {
	const nq = normalize(q);
	return !nq || normalize(text).includes(nq);
};

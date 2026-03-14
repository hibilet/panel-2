const toId = (v) => (typeof v === "object" && v?.id != null ? v.id : (v ?? ""));
const compact = (obj) =>
	Object.fromEntries(
		Object.entries(obj)
			.filter(([, v]) => v != null && v !== "")
			.map(([k, v]) => [k, v === "" ? null : v]),
	);

export { compact, toId };

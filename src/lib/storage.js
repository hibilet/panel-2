const setToken = (token) => {
	localStorage.setItem("token", token);
	window.location.replace("/");
};
const deleteToken = () => {
	localStorage.removeItem("token");
	// Signing out drops every impersonation below it too - leaving them would
	// hand the next user a live way back into an operator session.
	localStorage.removeItem(STACK_KEY);
	window.location.replace("/");
};
const getToken = () => localStorage.getItem("token");

// Impersonation stack.
//
// Sessions nest: superadmin -> realm admin -> merchant -> staff. A single
// hot-swap slot could only remember one step back, so the second hop lost the
// first. The stack keeps every session that was left behind, newest last, and
// each entry carries a label so the way back can say WHO it returns to.
const STACK_KEY = "tokenStack";

const readStack = () => {
	try {
		const list = JSON.parse(localStorage.getItem(STACK_KEY) ?? "[]");
		return Array.isArray(list) ? list.filter((e) => e?.token) : [];
	} catch {
		return [];
	}
};

const writeStack = (list) => {
	if (list.length) localStorage.setItem(STACK_KEY, JSON.stringify(list));
	else localStorage.removeItem(STACK_KEY);
};

// Fold the old single-slot key in once, so a session already impersonating
// when this shipped still has its way back.
const legacy = localStorage.getItem("hotSwapToken");
if (legacy) {
	localStorage.removeItem("hotSwapToken");
	writeStack([{ token: legacy, label: null }, ...readStack()]);
}

const pushToken = (token, label = null) => {
	if (!token) return;
	writeStack([...readStack(), { token, label }]);
};

// Removes and returns the session one level up. The caller applies it with
// setToken, which reloads - so nothing here needs to touch the page.
const popToken = () => {
	const list = readStack();
	const entry = list.pop() ?? null;
	writeStack(list);
	return entry;
};

const getTokenStack = () => readStack();

const clearTokenStack = () => writeStack([]);

const setLang = (lang) => {
	localStorage.setItem("lang", lang);
	window.location.reload();
};
const getLang = () => localStorage.getItem("lang");

export {
	clearTokenStack,
	deleteToken,
	getLang,
	getToken,
	getTokenStack,
	popToken,
	pushToken,
	setLang,
	setToken,
};

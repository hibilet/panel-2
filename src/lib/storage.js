const setToken = (token) => {
	localStorage.setItem("token", token);
	window.location.replace("/");
};
const deleteToken = () => {
	localStorage.removeItem("token");
	window.location.replace("/");
};
const getToken = () => localStorage.getItem("token");

const setHotSwapToken = (token) => {
	localStorage.setItem("hotSwapToken", token);
};
const deleteHotSwapToken = () => {
	localStorage.removeItem("hotSwapToken");
};
const getHotSwapToken = () => localStorage.getItem("hotSwapToken");

const setLang = (lang) => {
	localStorage.setItem("lang", lang);
	window.location.reload();
};
const getLang = () => localStorage.getItem("lang");

export {
	setToken,
	deleteToken,
	getToken,
	setHotSwapToken,
	deleteHotSwapToken,
	getHotSwapToken,
	setLang,
	getLang,
};

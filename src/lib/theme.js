const STORAGE_KEY = "theme";

export const getStoredTheme = () =>
	typeof localStorage !== "undefined"
		? localStorage.getItem(STORAGE_KEY)
		: null;

export const setTheme = (value) => {
	if (typeof localStorage !== "undefined") {
		if (value === "dark" || value === "light") {
			localStorage.setItem(STORAGE_KEY, value);
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	}
	applyTheme(value);
};

export const applyTheme = () => {
	const isDark = false;
	document.documentElement.classList.toggle("dark", false);
	window.dispatchEvent(new CustomEvent("themechange", { detail: { isDark } }));
	return isDark;
};

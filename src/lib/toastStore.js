let toastFn = null;

export const setToast = (fn) => {
	toastFn = fn;
};

export const showToast = (type, message) => {
	if (toastFn) toastFn(type, message);
};

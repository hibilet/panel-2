let toastFn = null;

export const setToast = (fn) => {
	toastFn = fn;
};

export const showToast = (type, message, options) => {
	if (toastFn) toastFn(type, message, options);
};

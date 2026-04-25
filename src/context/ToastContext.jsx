import {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { setToast } from "../lib/toastStore";

const ToastContext = createContext(null);

const TOAST_DURATION = 4000;
const MAX_TOASTS = 5;

export const ToastProvider = ({ children }) => {
	const [toasts, setToasts] = useState([]);
	const timersRef = useRef({});

	const dismiss = useCallback((id) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
		if (timersRef.current[id]) {
			clearTimeout(timersRef.current[id]);
			delete timersRef.current[id];
		}
	}, []);

	const show = useCallback(
		(type, message, options) => {
			const id = crypto.randomUUID();
			const duration = options?.durationMs ?? TOAST_DURATION;
			setToasts((prev) => {
				const next = [
					...prev,
					{
						id,
						type,
						message,
						actionLabel: options?.actionLabel,
						onAction: options?.onAction,
					},
				];
				return next.slice(-MAX_TOASTS);
			});
			const timer = setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
				delete timersRef.current[id];
			}, duration);
			timersRef.current[id] = timer;
		},
		[],
	);

	useEffect(() => {
		setToast(show);
		try {
			const pendingError = sessionStorage.getItem("pendingToast.error");
			if (pendingError) {
				sessionStorage.removeItem("pendingToast.error");
				show("error", pendingError);
			}
			const pendingSuccess = sessionStorage.getItem("pendingToast.success");
			if (pendingSuccess) {
				sessionStorage.removeItem("pendingToast.success");
				show("success", pendingSuccess);
			}
		} catch {}
		return () => {
			setToast(null);
			Object.values(timersRef.current).forEach(clearTimeout);
		};
	}, [show]);

	return (
		<ToastContext.Provider value={{ show, toasts }}>
			{children}
			<div
				className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 flex flex-col items-center gap-2"
				aria-live="polite"
			>
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={`animate-toast flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
							toast.type === "success"
								? "bg-emerald-600 text-white"
								: "bg-red-600 text-white"
						}`}
						role="alert"
					>
						{toast.type === "success" ? (
							<i className="fa-solid fa-check" aria-hidden />
						) : (
							<i className="fa-solid fa-xmark" aria-hidden />
						)}
						<span>{toast.message}</span>
						{toast.actionLabel && (
							<button
								type="button"
								onClick={() => {
									toast.onAction?.();
									dismiss(toast.id);
								}}
								className="ml-1 rounded border border-white/40 px-2 py-1 text-xs font-medium underline-offset-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
							>
								{toast.actionLabel}
							</button>
						)}
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
};

export const useToast = () => {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within ToastProvider");
	return ctx;
};

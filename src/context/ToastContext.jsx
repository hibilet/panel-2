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

	const show = useCallback((type, message) => {
		const id = crypto.randomUUID();
		setToasts((prev) => {
			const next = [...prev, { id, type, message }];
			return next.slice(-MAX_TOASTS);
		});
		const timer = setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
			delete timersRef.current[id];
		}, TOAST_DURATION);
		timersRef.current[id] = timer;
	}, []);

	useEffect(() => {
		setToast(show);
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
						className={`animate-toast flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg ${
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

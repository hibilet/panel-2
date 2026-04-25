import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { get, post } from "../lib/client";
import { getToken } from "../lib/storage";

const POLL_MS = 10000;
const PAGE_LIMIT = 50;

const NotificationsContext = createContext(null);

const dedupeMerge = (existing, incoming) => {
	if (!incoming?.length) return existing;
	const seen = new Set(existing.map((n) => n.id));
	const fresh = incoming.filter((n) => !seen.has(n.id));
	if (!fresh.length) return existing;
	return [...fresh, ...existing].sort(
		(a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
};

export const NotificationsProvider = ({ children }) => {
	const [items, setItems] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const sinceRef = useRef(null);
	const pollingRef = useRef(false);

	const poll = useCallback(async () => {
		if (!getToken()) return;
		if (pollingRef.current) return;
		pollingRef.current = true;
		try {
			const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
			if (sinceRef.current) params.set("since", sinceRef.current);
			const res = await get(`/notifications?${params.toString()}`);
			const payload = res?.data ?? {};
			const nextItems = payload.items ?? [];
			if (nextItems.length) {
				setItems((prev) => dedupeMerge(prev, nextItems));
				const newest = nextItems[0]?.createdAt;
				if (newest) sinceRef.current = newest;
			}
			if (typeof payload.unreadCount === "number") {
				setUnreadCount(payload.unreadCount);
			}
			setError(null);
		} catch (err) {
			setError(err?.message ?? "failed-load-notifications");
		} finally {
			pollingRef.current = false;
		}
	}, []);

	const loadInitial = useCallback(async () => {
		if (!getToken()) return;
		setLoading(true);
		try {
			const res = await get(`/notifications?limit=${PAGE_LIMIT}`);
			const payload = res?.data ?? {};
			const nextItems = payload.items ?? [];
			setItems(nextItems);
			setUnreadCount(payload.unreadCount ?? 0);
			if (nextItems[0]?.createdAt) sinceRef.current = nextItems[0].createdAt;
			setError(null);
		} catch (err) {
			setError(err?.message ?? "failed-load-notifications");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!getToken()) return undefined;
		loadInitial();
		const t = setInterval(poll, POLL_MS);
		return () => clearInterval(t);
	}, [loadInitial, poll]);

	const markRead = useCallback(async (id) => {
		if (!id) return;
		setItems((prev) =>
			prev.map((n) =>
				n.id === id && !n.readAt
					? { ...n, readAt: new Date().toISOString() }
					: n,
			),
		);
		setUnreadCount((c) => Math.max(0, c - 1));
		try {
			await post(`/notifications/${id}/read`);
		} catch {
			poll();
		}
	}, [poll]);

	const markAllRead = useCallback(async () => {
		const now = new Date().toISOString();
		setItems((prev) =>
			prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
		);
		setUnreadCount(0);
		try {
			await post("/notifications/read-all");
		} catch {
			poll();
		}
	}, [poll]);

	const value = useMemo(
		() => ({
			items,
			unreadCount,
			loading,
			error,
			refresh: poll,
			markRead,
			markAllRead,
		}),
		[items, unreadCount, loading, error, poll, markRead, markAllRead],
	);

	return (
		<NotificationsContext.Provider value={value}>
			{children}
		</NotificationsContext.Provider>
	);
};

export const useNotifications = () => {
	const ctx = useContext(NotificationsContext);
	if (!ctx)
		throw new Error(
			"useNotifications must be used within NotificationsProvider",
		);
	return ctx;
};

export default NotificationsContext;

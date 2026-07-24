import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
} from "react";
import { get } from "../lib/client";
import { getToken } from "../lib/storage";
import { setViewer } from "../lib/money";

const AppContext = createContext(null);

const mapSalesRows = (rows) =>
	(rows ?? []).map((row) => ({
		...row,
		startDate: row.start ?? row.startDate,
	}));

const realmIdOf = (account) =>
	account?.realm?._id ?? account?.realm?.id ?? null;

export const AppProvider = ({ children }) => {
	const [account, setAccount] = useState(null);
	const [realm, setRealm] = useState(null);
	const [sales, setSales] = useState([]);
	const [providers, setProviders] = useState([]);
	const [agreements, setAgreements] = useState([]);
	const [venues, setVenues] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const venuePlansRef = useRef({});

	const fetchRealmFor = useCallback(async (accountObj) => {
		// Merchants get their realm inlined on /accounts/me (the api me()
		// aggregator $lookups it with secrets stripped). Use that directly
		// so channel/link URL helpers work without a /realms/:id call
		// (which is admin-only).
		if (accountObj?.realm && typeof accountObj.realm === "object") {
			return accountObj.realm;
		}
		if (accountObj?.type !== "account.admin") return null;
		const id = realmIdOf(accountObj);
		if (!id) return null;
		try {
			const r = await get(`/realms/${id}`);
			return r?.data ?? null;
		} catch {
			return null;
		}
	}, []);

	const fetchInitial = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			// Each secondary fetch has its own catch: one of them failing (a 500,
			// or a 403 for a restricted role) must NOT blank the whole session -
			// account/viewer/permissions still resolve from /accounts/me.
			const [accountRes, salesRes, providersRes, agreementsRes, venuesRes] =
				await Promise.all([
					get("/accounts/me").catch(() => ({ data: null })),
					get("/sales").catch(() => ({ data: [] })),
					get("/providers").catch(() => ({ data: [] })),
					get("/agreements").catch(() => ({ data: [] })),
					get("/venues").catch(() => ({ data: [] })),
				]);
			const accountData = accountRes?.data ?? null;
			setAccount(accountData);
			setViewer(accountData);
			setSales(mapSalesRows(salesRes.data ?? []));
			setProviders(providersRes.data ?? []);
			setAgreements(agreementsRes.data ?? []);
			setVenues(venuesRes.data ?? []);
			setRealm(await fetchRealmFor(accountData));
		} catch (err) {
			setError(err?.message ?? "Failed to load app data");
		} finally {
			setLoading(false);
		}
	}, [fetchRealmFor]);

	useEffect(() => {
		if (getToken()) {
			fetchInitial();
		}
	}, [fetchInitial]);

	// Apply realm whitelabel to the document chrome once the realm loads. The
	// static configs.json title/favicon (set in index.jsx by hostname) is just
	// the pre-login default; the realm's own branding overrides it for the
	// authenticated session. primaryColor is intentionally not applied - the
	// panel palette is fixed and doesn't read it.
	useEffect(() => {
		if (typeof document === "undefined" || !realm) return;
		const branding = realm.branding ?? {};
		const appName = branding.appName || realm.name;
		if (appName) document.title = appName;
		if (branding.favicon) {
			const link = document.querySelector('link[rel="icon"]');
			if (link) link.href = branding.favicon;
		}
	}, [realm]);

	const getVenuePlans = useCallback(async (venueId) => {
		if (!venueId) return [];
		if (venuePlansRef.current[venueId]) return venuePlansRef.current[venueId];
		try {
			const r = await get(`/venues/plans/search?venue=${venueId}`);
			const plans = r.data ?? [];
			venuePlansRef.current[venueId] = plans;
			return plans;
		} catch {
			return [];
		}
	}, []);

	const refreshSales = useCallback(async (opts = {}) => {
		const qs = opts.revenue ? "?revenue=true" : "";
		try {
			const r = await get(`/sales${qs}`);
			setSales(mapSalesRows(r.data ?? []));
			return r.data ?? [];
		} catch (err) {
			setError(err?.message ?? "Failed to refresh sales");
			return [];
		}
	}, []);

	const refreshAccount = useCallback(async () => {
		try {
			const r = await get("/accounts/me");
			const refreshed = r?.data ?? null;
			setAccount(refreshed);
			setViewer(refreshed);
			return r?.data ?? null;
		} catch {
			return null;
		}
	}, []);

	const refreshRealm = useCallback(async () => {
		const next = await fetchRealmFor(account);
		setRealm(next);
		return next;
	}, [account, fetchRealmFor]);

	const updateAccount = useCallback((updates) => {
		setAccount((prev) => {
			const next = prev ? { ...prev, ...updates } : updates;
			setViewer(next);
			return next;
		});
	}, []);

	const addVenue = useCallback((venue) => {
		setVenues((prev) => [...prev, venue]);
	}, []);

	const updateVenue = useCallback((id, updates) => {
		setVenues((prev) =>
			prev.map((v) => (v.id === id || v._id === id ? { ...v, ...updates } : v)),
		);
	}, []);

	const addSale = useCallback((sale) => {
		setSales((prev) => [sale, ...prev]);
	}, []);

	const updateSale = useCallback((id, updates) => {
		setSales((prev) =>
			prev.map((s) => (s.id === id || s._id === id ? { ...s, ...updates } : s)),
		);
	}, []);

	const addProvider = useCallback((provider) => {
		setProviders((prev) => [...prev, provider]);
	}, []);

	const updateProvider = useCallback((id, updates) => {
		setProviders((prev) =>
			prev.map((p) => (p.id === id || p._id === id ? { ...p, ...updates } : p)),
		);
	}, []);

	const addAgreement = useCallback((agreement) => {
		setAgreements((prev) => [...prev, agreement]);
	}, []);

	const updateAgreement = useCallback((id, updates) => {
		setAgreements((prev) =>
			prev.map((a) => (a.id === id || a._id === id ? { ...a, ...updates } : a)),
		);
	}, []);

	const value = {
		account,
		realm,
		sales,
		providers,
		agreements,
		venues,
		getVenuePlans,
		loading,
		error,
		refreshSales,
		refreshAccount,
		refreshRealm,
		updateAccount,
		addVenue,
		updateVenue,
		addSale,
		updateSale,
		addProvider,
		updateProvider,
		addAgreement,
		updateAgreement,
	};

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
	const ctx = useContext(AppContext);
	if (!ctx) throw new Error("useApp must be used within AppProvider");
	return ctx;
};

export default AppContext;

import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import DataTable from "../../../components/tables/DataTable";
import { get, post } from "../../../lib/client";
import { getToken, setHotSwapToken, setToken } from "../../../lib/storage";
import strings, { formatCurrency } from "../../../localization";
import PlatformConfig from "./PlatformConfig";
import PlatformSeller from "./PlatformSeller";

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "—");

const toneFor = (state) =>
	state === "up"
		? "bg-emerald-50 text-emerald-700 border-emerald-200"
		: state === "warn"
			? "bg-amber-50 text-amber-700 border-amber-200"
			: state === "off"
				? "bg-slate-50 text-slate-500 border-slate-200"
				: "bg-red-50 text-red-700 border-red-200";

const HealthCard = ({ title, state, lines, loading }) => {
	if (loading) {
		return (
			<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
				<div className="h-[14px] w-28 animate-shimmer rounded" />
				<div className="mt-3 h-6 w-20 animate-shimmer rounded" />
				<div className="mt-3 h-[14px] w-40 animate-shimmer rounded" />
			</div>
		);
	}
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium text-slate-700">{title}</p>
				<span
					className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${toneFor(state.tone)}`}
				>
					{state.label}
				</span>
			</div>
			<dl className="mt-3 space-y-1">
				{lines.map(([label, value]) => (
					<div key={label} className="flex justify-between gap-3 text-xs">
						<dt className="text-slate-500">{label}</dt>
						<dd className="truncate text-slate-700">{value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
};

const Platform = () => {
	const [, setLocation] = useLocation();
	const [health, setHealth] = useState(null);
	const [healthLoading, setHealthLoading] = useState(true);
	const [healthError, setHealthError] = useState(null);

	const [realms, setRealms] = useState([]);
	const [realmsLoading, setRealmsLoading] = useState(true);
	const [error, setError] = useState(null);

	// Account counts come from GET /accounts, which for a superadmin returns
	// EVERY account on the deployment - customers included. That is too heavy to
	// run on every page view, so it is a deliberate click.
	const [counts, setCounts] = useState(null);
	const [countsLoading, setCountsLoading] = useState(false);
	const [adminsByRealm, setAdminsByRealm] = useState({});
	const [actingOn, setActingOn] = useState(null);

	const fetchHealth = useCallback(() => {
		setHealthLoading(true);
		setHealthError(null);
		get("/monitor/health")
			.then((res) => setHealth(res.data ?? null))
			.catch((err) =>
				setHealthError(err?.message ?? strings("error.failedLoad")),
			)
			.finally(() => setHealthLoading(false));
	}, []);

	useEffect(() => {
		fetchHealth();
		get("/realms")
			.then((res) => setRealms(res.data ?? []))
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadRealms")),
			)
			.finally(() => setRealmsLoading(false));
	}, [fetchHealth]);

	const loadCounts = () => {
		setCountsLoading(true);
		get("/accounts")
			.then((res) => {
				const rows = res.data ?? [];
				const tally = {};
				const admins = {};
				for (const row of rows) {
					const realmId = String(row.realm ?? "");
					if (!realmId) continue;
					const bucket = tally[realmId] ?? { merchants: 0, admins: 0 };
					if (row.type === "account.merchant") bucket.merchants += 1;
					if (row.type === "account.admin") {
						bucket.admins += 1;
						// Remember one reachable admin per realm so the operator can
						// drop into that brand's panel without hunting for a login.
						if (
							!admins[realmId] &&
							row.status === "active" &&
							!row.superadmin
						) {
							admins[realmId] = {
								id: row.id ?? row._id,
								name: row.name,
								email: row.email,
							};
						}
					}
					tally[realmId] = bucket;
				}
				setCounts(tally);
				setAdminsByRealm(admins);
			})
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadAccounts")),
			)
			.finally(() => setCountsLoading(false));
	};

	const actAsRealm = async (realmId) => {
		const target = adminsByRealm[String(realmId)];
		if (!target?.id) return;
		setActingOn(String(realmId));
		setError(null);
		try {
			const res = await post("/auth/token", {
				id: target.id,
				type: "account.admin",
			});
			const token = res?.data?.token ?? res?.token;
			if (!token) {
				setError(strings("form.account.errorLoginAs"));
				return;
			}
			const current = getToken();
			if (current) setHotSwapToken(current);
			setToken(token);
		} catch (err) {
			setError(err?.message ?? strings("form.account.errorLoginAs"));
		} finally {
			setActingOn(null);
		}
	};

	const mongo = health?.mongo;
	const redis = health?.redis;
	const facts = health?.facts;

	const columns = [
		{
			key: "name",
			header: strings("table.realm.name"),
			headerCell: true,
			render: (r) => r.name ?? "—",
		},
		{
			key: "billing",
			header: strings("page.platform.billing"),
			render: (r) => {
				const active = r.platform?.status === "active";
				return (
					<span
						className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
							active
								? "bg-emerald-100 text-emerald-700"
								: "bg-slate-100 text-slate-500"
						}`}
					>
						{active
							? strings("page.platform.billingActive")
							: strings("page.platform.billingInactive")}
					</span>
				);
			},
		},
		{
			key: "pricing",
			header: strings("page.platform.pricing"),
			render: (r) => {
				const p = r.platform?.pricing;
				if (!p) return "—";
				const parts = [];
				if (p.baseFee) parts.push(formatCurrency(p.baseFee, p.currency));
				if (p.perTicketFee)
					parts.push(
						`${formatCurrency(p.perTicketFee, p.currency)}/${strings("page.platform.ticket")}`,
					);
				if (p.commissionRate)
					parts.push(`${(p.commissionRate * 100).toFixed(2)}%`);
				return parts.length ? parts.join(" + ") : "—";
			},
		},
		{
			key: "nextInvoiceAt",
			header: strings("page.platform.nextInvoice"),
			render: (r) => formatDate(r.platform?.nextInvoiceAt),
		},
		{
			key: "merchants",
			header: strings("page.platform.merchants"),
			align: "right",
			render: (r) => {
				const c = counts?.[String(r.id ?? r._id)];
				if (!counts) return <span className="text-slate-400">—</span>;
				return (c?.merchants ?? 0).toLocaleString();
			},
		},
		{
			key: "act",
			header: "",
			align: "right",
			render: (r) => {
				const realmId = String(r.id ?? r._id);
				const target = adminsByRealm[realmId];
				if (!target) return null;
				return (
					<button
						type="button"
						disabled={actingOn === realmId}
						onClick={(e) => {
							e.stopPropagation();
							actAsRealm(realmId);
						}}
						title={target.email}
						className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
					>
						<i className="fa-solid fa-right-to-bracket" aria-hidden />
						{strings("page.platform.actAs")}
					</button>
				);
			},
		},
	];

	return (
		<div className="mx-auto max-w-5xl space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
					<i
						className="fa-solid fa-tower-broadcast text-slate-600"
						aria-hidden
					/>
					{strings("page.platform.title")}
				</h1>
				<button
					type="button"
					onClick={fetchHealth}
					disabled={healthLoading}
					className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50"
				>
					<i className="fa-solid fa-rotate" aria-hidden />
					{strings("page.platform.refresh")}
				</button>
			</div>

			{(error || healthError) && (
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
					{error ?? healthError}
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-3">
				<HealthCard
					title="Mongo"
					loading={healthLoading}
					state={{
						tone: mongo?.up ? "up" : "down",
						label: mongo?.status ?? "—",
					}}
					lines={[
						[
							strings("page.platform.ping"),
							mongo?.pingMs != null ? `${mongo.pingMs} ms` : "—",
						],
						[strings("page.platform.database"), mongo?.name ?? "—"],
						[
							strings("page.platform.topology"),
							typeof mongo?.replicaSet === "string"
								? mongo.replicaSet
								: (mongo?.replicaSet?.set ?? "—"),
						],
					]}
				/>
				<HealthCard
					title="Redis"
					loading={healthLoading}
					state={{
						tone: redis?.up ? "up" : redis?.enabled === false ? "off" : "down",
						label: redis?.status ?? "—",
					}}
					lines={[
						[
							strings("page.platform.ping"),
							redis?.pingMs != null ? `${redis.pingMs} ms` : "—",
						],
						[
							strings("page.platform.hitRate"),
							redis?.stats?.hitRate != null
								? `${Math.round(redis.stats.hitRate * 100)}%`
								: "—",
						],
						[
							strings("page.platform.keys"),
							redis?.stats?.keys?.toLocaleString?.() ?? "—",
						],
					]}
				/>
				<HealthCard
					title={strings("page.platform.facts")}
					loading={healthLoading}
					state={{
						tone: facts?.up ? "up" : facts?.stale ? "warn" : "down",
						label: facts?.stale
							? strings("page.platform.stale")
							: strings("page.platform.fresh"),
					}}
					lines={[
						[
							strings("page.platform.lastRollup"),
							formatDate(facts?.lastRollupAt),
						],
						[
							strings("page.platform.age"),
							facts?.ageHours != null ? `${facts.ageHours} h` : "—",
						],
						[
							strings("page.platform.rows"),
							facts?.rows?.toLocaleString?.() ?? "—",
						],
					]}
				/>
			</div>

			<div className="space-y-3">
				<PlatformSeller />
				<PlatformConfig />
			</div>

			<div className="space-y-3">
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-lg font-semibold text-slate-900">
						{strings("page.platform.realms")}
					</h2>
					<button
						type="button"
						onClick={loadCounts}
						disabled={countsLoading}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
					>
						<i className="fa-solid fa-users" aria-hidden />
						{countsLoading
							? strings("common.loading")
							: strings("page.platform.loadCounts")}
					</button>
				</div>
				<DataTable
					data={realms}
					columns={columns}
					getRowKey={(r) => r.id ?? r._id}
					onRowClick={(row) => {
						const rid = row.id ?? row._id;
						if (rid) setLocation(`/realms/${rid}`);
					}}
					loading={realmsLoading}
					emptyMessage={strings("table.realm.noRealms")}
				/>
			</div>
		</div>
	);
};

export default Platform;

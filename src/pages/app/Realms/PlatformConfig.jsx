import { useEffect, useMemo, useState } from "react";

import { get, put } from "../../../lib/client";

// Superadmin editor for the BASE platform config store (Stripe/SMTP/AI/URL
// fallbacks behind per-realm overrides). Config values are editable text;
// secrets show only set/unset and a field to REPLACE (their value never leaves
// the server). A key also set in .env is pinned there (SSOT) and shown as such.
const META = {
	// URLs
	API_URL: { group: "URLs", label: "API URL" },
	DASHBOARD_URL: { group: "URLs", label: "Panel URL" },
	TICKETS_URL: { group: "URLs", label: "Widget / tickets URL" },
	// Stripe
	STRIPE_CONNECT_CLIENT_ID: { group: "Stripe", label: "Connect client id" },
	STRIPE_CONNECT_REDIRECT_URI: { group: "Stripe", label: "Connect redirect URI" },
	STRIPE_CONNECT_SECRET: { group: "Stripe", label: "Connect secret" },
	STRIPE_CONNECT_WEBHOOK_SECRET: { group: "Stripe", label: "Connect webhook secret" },
	STRIPE_TRANSACTION_WEBHOOK_SECRET: { group: "Stripe", label: "Transaction webhook secret" },
	STRIPE_BILLING_WEBHOOK_SECRET: { group: "Stripe", label: "Billing webhook secret" },
	// Email
	SMTP_HOST: { group: "Email", label: "SMTP host" },
	SMTP_PORT: { group: "Email", label: "SMTP port" },
	SMTP_USER: { group: "Email", label: "SMTP user" },
	SMTP_NAME: { group: "Email", label: "SMTP from-name" },
	SMTP_PASS: { group: "Email", label: "SMTP password" },
	RESEND_API_KEY: { group: "Email", label: "Resend API key" },
	RESEND_WEBHOOK_SECRET: { group: "Email", label: "Resend webhook secret" },
	RESEND_REGION: { group: "Email", label: "Resend region" },
	// AI / media
	XAI_MODEL: { group: "AI / media", label: "xAI model" },
	OPEN_ROUTER_API_KEY: { group: "AI / media", label: "OpenRouter API key" },
	XAI_API_KEY: { group: "AI / media", label: "xAI API key" },
	IMGBB_API_KEY: { group: "AI / media", label: "ImgBB API key" },
	// Other
	CLOUDFLARE_ZONE_ID: { group: "Other", label: "Cloudflare zone id" },
	CLOUDFLARE_API_TOKEN: { group: "Other", label: "Cloudflare API token" },
	IPGEO_URL: { group: "Other", label: "IP-geo URL" },
};
const GROUP_ORDER = ["URLs", "Stripe", "Email", "AI / media", "Other"];
const metaOf = (k) => META[k] ?? { group: "Other", label: k };

const PlatformConfig = () => {
	const [open, setOpen] = useState(false);
	const [data, setData] = useState(null);
	const [cfg, setCfg] = useState({});
	const [sec, setSec] = useState({});
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState(null);

	const load = () => get("/platform/config")
		.then((res) => {
			setData(res.data ?? null);
			setCfg(res.data?.config ?? {});
			setSec({});
		})
		.catch((e) => setStatus(e?.message ?? "Load failed"));
	useEffect(() => { load(); }, []);

	const configKeys = useMemo(() => data?.keys?.config ?? [], [data]);
	const secretKeys = useMemo(() => data?.keys?.secret ?? [], [data]);
	const pinned = useMemo(() => new Set(data?.envPinned ?? []), [data]);

	// Group every key for a tidy two-column layout.
	const groups = useMemo(() => {
		const g = {};
		for (const k of [...configKeys, ...secretKeys]) {
			const { group } = metaOf(k);
			(g[group] ??= []).push(k);
		}
		return GROUP_ORDER.filter((name) => g[name]).map((name) => [name, g[name]]);
	}, [configKeys, secretKeys]);

	const save = async () => {
		setSaving(true);
		setStatus(null);
		try {
			// Only send secrets the user actually typed (blank = leave unchanged).
			const secrets = Object.fromEntries(
				Object.entries(sec).filter(([, v]) => v && v.trim() !== ""),
			);
			const res = await put("/platform/config", { config: cfg, secrets });
			setData(res.data ?? data);
			setCfg(res.data?.config ?? cfg);
			setSec({});
			setStatus("saved");
		} catch (err) {
			setStatus(err?.message ?? "Save failed");
		} finally {
			setSaving(false);
		}
	};

	const isSecret = (k) => secretKeys.includes(k);

	return (
		<div className="rounded-lg border border-slate-200 bg-white">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-700"
			>
				<span className="flex items-center gap-2">
					<i className="fa-solid fa-sliders text-slate-500" aria-hidden />
					Platform settings (Stripe / SMTP / AI - operator defaults)
				</span>
				<i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-slate-400`} aria-hidden />
			</button>

			{open && (
				<div className="border-t border-slate-200 px-4 py-4">
					<p className="mb-3 text-xs text-slate-500">
						Operator-wide fallbacks behind per-realm overrides, stored encrypted in
						the database. Secrets show only whether they are set - enter a value to
						replace. A key also present in <code>.env</code> is pinned there and wins
						over this store.
					</p>

					{groups.map(([group, keys]) => (
						<div key={group} className="mb-4">
							<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group}</p>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{keys.map((k) => {
									const { label } = metaOf(k);
									const isPinned = pinned.has(k);
									return (
										<label key={k} className="text-xs font-medium text-slate-600">
											<span className="flex items-center gap-2">
												{label}
												{isSecret(k) && (
													<span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${data?.secretsSet?.[k] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
														{data?.secretsSet?.[k] ? "set" : "not set"}
													</span>
												)}
												{isPinned && (
													<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title="Set in .env - overrides this store">
														.env
													</span>
												)}
											</span>
											{isSecret(k) ? (
												<input
													type="password"
													autoComplete="new-password"
													value={sec[k] ?? ""}
													placeholder={data?.secretsSet?.[k] ? "•••••• (enter to replace)" : "not set"}
													onChange={(e) => setSec((s) => ({ ...s, [k]: e.target.value }))}
													className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
												/>
											) : (
												<input
													type="text"
													value={cfg[k] ?? ""}
													onChange={(e) => setCfg((c) => ({ ...c, [k]: e.target.value }))}
													className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
												/>
											)}
										</label>
									);
								})}
							</div>
						</div>
					))}

					<div className="mt-2 flex items-center justify-end gap-3">
						{status === "saved" && <span className="text-xs text-green-600">Saved</span>}
						{status && status !== "saved" && <span className="text-xs text-red-600">{status}</span>}
						<button
							type="button"
							onClick={save}
							disabled={saving || !data}
							className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
						>
							{saving ? "Saving…" : "Save settings"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default PlatformConfig;

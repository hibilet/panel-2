import { useEffect, useMemo, useState } from "react";

import { get, put } from "../../../lib/client";
import strings from "../../../localization";

// Superadmin editor for the BASE platform config store (Stripe/SMTP/AI/URL
// fallbacks behind per-realm overrides). Config values are editable text;
// secrets show only set/unset and a field to REPLACE (their value never leaves
// the server). A key also set in .env is pinned there (SSOT) and shown as such.
// Group per env key; the display name for both the key and its group comes
// from the dictionary (page.platform.config.field.<KEY> / .group.<group>) so
// this screen reads in the operator's language like the rest of the panel.
const GROUP_OF = {
	API_URL: "urls",
	DASHBOARD_URL: "urls",
	TICKETS_URL: "urls",
	STRIPE_CONNECT_CLIENT_ID: "stripe",
	STRIPE_CONNECT_REDIRECT_URI: "stripe",
	STRIPE_CONNECT_SECRET: "stripe",
	STRIPE_CONNECT_WEBHOOK_SECRET: "stripe",
	STRIPE_TRANSACTION_WEBHOOK_SECRET: "stripe",
	STRIPE_BILLING_WEBHOOK_SECRET: "stripe",
	SMTP_HOST: "email",
	SMTP_PORT: "email",
	SMTP_USER: "email",
	SMTP_NAME: "email",
	SMTP_PASS: "email",
	RESEND_API_KEY: "email",
	RESEND_WEBHOOK_SECRET: "email",
	RESEND_REGION: "email",
	XAI_MODEL: "ai",
	OPEN_ROUTER_API_KEY: "ai",
	XAI_API_KEY: "ai",
	IMGBB_API_KEY: "ai",
	CLOUDFLARE_ZONE_ID: "other",
	CLOUDFLARE_API_TOKEN: "other",
	IPGEO_URL: "other",
};
const GROUP_ORDER = ["urls", "stripe", "email", "ai", "other"];
const groupOf = (k) => GROUP_OF[k] ?? "other";
// An unknown key (added server-side, not yet listed here) falls back to the
// raw env name rather than rendering a missing-translation placeholder.
const fieldLabel = (k) => (GROUP_OF[k] ? strings(`page.platform.config.field.${k}`) : k);

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
		.catch((e) => setStatus(e?.message ?? strings("error.failedLoad")));
	useEffect(() => { load(); }, []);

	const configKeys = useMemo(() => data?.keys?.config ?? [], [data]);
	const secretKeys = useMemo(() => data?.keys?.secret ?? [], [data]);
	const pinned = useMemo(() => new Set(data?.envPinned ?? []), [data]);

	// Group every key for a tidy two-column layout.
	const groups = useMemo(() => {
		const g = {};
		for (const k of [...configKeys, ...secretKeys]) {
			(g[groupOf(k)] ??= []).push(k);
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
			setStatus(err?.message ?? strings("error.failedSave"));
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
					{strings("page.platform.config.title")}
				</span>
				<i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-slate-400`} aria-hidden />
			</button>

			{open && (
				<div className="border-t border-slate-200 px-4 py-4">
					<p className="mb-3 text-xs text-slate-500">
						{strings("page.platform.config.intro")}
					</p>

					{groups.map(([group, keys]) => (
						<div key={group} className="mb-4">
							<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
								{strings(`page.platform.config.group.${group}`)}
							</p>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{keys.map((k) => {
									const isPinned = pinned.has(k);
									return (
										<label key={k} className="text-xs font-medium text-slate-600">
											<span className="flex items-center gap-2">
												{fieldLabel(k)}
												{isSecret(k) && (
													<span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${data?.secretsSet?.[k] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
														{strings(data?.secretsSet?.[k] ? "page.platform.config.set" : "page.platform.config.notSet")}
													</span>
												)}
												{isPinned && (
													<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title={strings("page.platform.config.envPinned")}>
														.env
													</span>
												)}
											</span>
											{isSecret(k) ? (
												<input
													type="password"
													autoComplete="new-password"
													value={sec[k] ?? ""}
													placeholder={strings(data?.secretsSet?.[k] ? "page.platform.config.replaceHint" : "page.platform.config.notSet")}
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
						{status === "saved" && <span className="text-xs text-green-600">{strings("common.saved")}</span>}
						{status && status !== "saved" && <span className="text-xs text-red-600">{status}</span>}
						<button
							type="button"
							onClick={save}
							disabled={saving || !data}
							className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
						>
							{saving ? strings("common.saving") : strings("page.platform.config.save")}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default PlatformConfig;

import { useEffect, useState } from "react";
import { Link } from "wouter";

import { get, post, put } from "../../../../lib/client";
import { useFamilyEnabled } from "../../../../lib/useCapabilities";
import strings, { formatCurrency } from "../../../../localization";

const FREQS = ["daily", "weekly", "monthly"];
const OPTIONS = ["off", ...FREQS];

const priceLabel = (priceGrid, freq) => {
	if (freq === "off") return null;
	const price = Number(priceGrid?.[freq] ?? 0);
	if (price <= 0) return strings("page.sale.reporting.free");
	return strings("page.sale.reporting.feeNote").replace(
		"{price}",
		formatCurrency(price),
	);
};

const Row = ({ type, conf, priceGrid, onChange, onRunNow, running }) => {
	const current = conf?.enabled ? conf.frequency || "monthly" : "off";
	const note = priceLabel(priceGrid, current);
	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-3">
				<span className="w-20 text-sm font-medium text-slate-700">
					{strings(
						type === "sales"
							? "page.sale.reporting.sales"
							: "page.sale.reporting.churn",
					)}
				</span>
				<div className="flex flex-wrap gap-1.5">
					{OPTIONS.map((opt) => (
						<button
							type="button"
							key={opt}
							onClick={() => onChange(opt)}
							className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
								current === opt
									? "border-slate-900 bg-slate-900 text-white"
									: "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
							}`}
						>
							{strings(
								opt === "off"
									? "page.sale.reporting.summary.off"
									: `page.sale.reporting.freq.${opt}`,
							)}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={onRunNow}
					disabled={running}
					className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				>
					<i
						className={`fa-solid ${running ? "fa-spinner fa-spin" : "fa-bolt"}`}
						aria-hidden
					/>
					{strings("page.sale.reporting.summary.runNow")}
				</button>
			</div>
			{note && <p className="ml-20 text-xs text-slate-500">{note}</p>}
		</div>
	);
};

const SaleReportingSection = ({ sale, setSale }) => {
	const reportingEnabled = useFamilyEnabled("reporting");
	const [tierGrid, setTierGrid] = useState(null);
	const [reporting, setReporting] = useState(
		sale?.reporting || {
			sales: { enabled: false, frequency: "monthly" },
			churn: { enabled: false, frequency: "monthly" },
		},
	);
	const [savingType, setSavingType] = useState(null);
	const [running, setRunning] = useState(null);
	const [toast, setToast] = useState(null);

	useEffect(() => {
		if (sale?.reporting) setReporting(sale.reporting);
	}, [sale?.id, sale?.reporting]);

	useEffect(() => {
		if (!reportingEnabled) return;
		get("/tiers/subscription")
			.then((r) => setTierGrid(r?.data?.tier?.reporting || null))
			.catch(() => setTierGrid(null));
	}, [reportingEnabled]);

	if (!reportingEnabled) return null;

	const saveType = async (type, opt) => {
		const next = {
			...reporting,
			[type]:
				opt === "off"
					? { enabled: false, frequency: reporting[type]?.frequency || "monthly" }
					: { enabled: true, frequency: opt },
		};
		setReporting(next);
		setSavingType(type);
		try {
			const res = await put(`/sales/${sale.id}`, {
				reporting: next,
				type: sale.type,
			});
			if (res?.data) setSale(res.data);
		} finally {
			setSavingType(null);
		}
	};

	const runNow = async (type) => {
		setRunning(type);
		setToast(null);
		try {
			const res = await post(`/sales/${sale.id}/reports/now`, { type });
			setToast({
				kind: "ok",
				message: strings("page.sale.reporting.summary.ranOk").replace(
					"{type}",
					strings(`page.sale.reporting.${type}`),
				),
				reportId: res?.data?.report?.id ?? res?.data?.report?._id ?? null,
			});
		} catch (err) {
			setToast({
				kind: "err",
				message: err?.message ?? strings("error.failedSave"),
			});
		} finally {
			setRunning(null);
		}
	};

	return (
		<>
			<h2 className="text-lg font-medium text-slate-900">
				{strings("page.sale.reporting.title")}
			</h2>
			<section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
				<Row
					type="sales"
					conf={reporting.sales}
					priceGrid={tierGrid?.sales}
					onChange={(opt) => saveType("sales", opt)}
					onRunNow={() => runNow("sales")}
					running={running === "sales" || savingType === "sales"}
				/>
				<Row
					type="churn"
					conf={reporting.churn}
					priceGrid={tierGrid?.churn}
					onChange={(opt) => saveType("churn", opt)}
					onRunNow={() => runNow("churn")}
					running={running === "churn" || savingType === "churn"}
				/>
				{toast && (
					<div
						className={`rounded-md px-3 py-2 text-xs ${
							toast.kind === "ok"
								? "bg-emerald-50 text-emerald-800"
								: "bg-red-50 text-red-700"
						}`}
					>
						{toast.message}
						{toast.reportId && (
							<>
								{" "}
								<Link
									href={`/reports/${toast.reportId}`}
									className="font-medium underline"
								>
									{strings("page.sale.reporting.summary.viewReport")}
								</Link>
							</>
						)}
					</div>
				)}
			</section>
		</>
	);
};

export default SaleReportingSection;

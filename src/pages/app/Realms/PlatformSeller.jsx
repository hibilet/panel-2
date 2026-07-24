import { useEffect, useState } from "react";

import { get, put } from "../../../lib/client";

// The platform operator's own invoice identity - the single legal entity that
// issues invoices TO every realm. One global entity (config-store model), so
// this is platform-wide settings, superadmin-only.
const FIELDS = [
	["legalName", "Legal name"],
	["tradeName", "Trade name"],
	["vatId", "VAT id"],
	["registry", "Registry"],
	["iban", "IBAN"],
	["email", "Email"],
	["phone", "Phone"],
	["country", "Country (ISO-2)"],
	["invoiceNumberPrefix", "Invoice number prefix"],
];

const PlatformSeller = () => {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState({});
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState(null);

	useEffect(() => {
		get("/realms/platform/seller")
			.then((res) => setForm(res.data ?? {}))
			.catch(() => setForm({}));
	}, []);

	const save = async () => {
		setSaving(true);
		setStatus(null);
		try {
			const res = await put("/realms/platform/seller", form);
			setForm(res.data ?? form);
			setStatus("saved");
		} catch (err) {
			setStatus(err?.message ?? "Save failed");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="rounded-lg border border-slate-200 bg-white">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-700"
			>
				<span className="flex items-center gap-2">
					<i className="fa-solid fa-building-columns text-slate-500" aria-hidden />
					Platform seller (who bills the realms)
				</span>
				<i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-slate-400`} aria-hidden />
			</button>

			{open && (
				<div className="border-t border-slate-200 px-4 py-4">
					<p className="mb-3 text-xs text-slate-500">
						The operator's legal entity. Its name, VAT id and number prefix appear
						on every platform invoice issued to a realm.
					</p>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{FIELDS.map(([key, label]) => (
							<label key={key} className="text-xs font-medium text-slate-600">
								{label}
								<input
									type="text"
									value={form[key] ?? ""}
									onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
								/>
							</label>
						))}
					</div>
					<div className="mt-3 flex items-center justify-end gap-3">
						{status === "saved" && (
							<span className="text-xs text-green-600">Saved</span>
						)}
						{status && status !== "saved" && (
							<span className="text-xs text-red-600">{status}</span>
						)}
						<button
							type="button"
							onClick={save}
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
						>
							{saving ? "Saving…" : "Save seller"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default PlatformSeller;

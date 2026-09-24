import { useState } from "react";
import { put } from "../../lib/client";
import strings from "../../localization";
import { Modal } from "../shared";

// Pausing sales is a reversible stop: it blocks new orders (API rejects
// reservations and checkout with `sale-paused`) without refunding or voiding
// anything already sold. Cancel (SaleCancelZone) is the heavier, irreversible
// sibling. Resume flips the sale back to active.
const SalePauseZone = ({ sale, onChanged }) => {
	const id = sale?.id ?? sale?._id;
	const paused = sale?.status === "paused";

	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	const run = async (status) => {
		setBusy(true);
		setError(null);
		try {
			await put(`/sales/${id}`, { status });
			setOpen(false);
			onChanged?.();
		} catch (err) {
			setError(err?.message ?? strings("common.errorOccurred"));
		} finally {
			setBusy(false);
		}
	};

	if (paused) {
		return (
			<div className="mt-8 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
				<div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-800">
					<i className="fa-solid fa-pause" aria-hidden />
					{strings("page.sale.pause.pausedTitle")}
				</div>
				<p className="mb-3 text-xs text-amber-800/80">
					{strings("page.sale.pause.pausedDesc")}
				</p>
				<button
					type="button"
					onClick={() => run("active")}
					disabled={busy}
					className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
				>
					<i
						className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-play"}`}
						aria-hidden
					/>
					{strings("page.sale.pause.resumeButton")}
				</button>
				{error && <p className="mt-2 text-xs text-red-600">{error}</p>}
			</div>
		);
	}

	return (
		<div className="mt-8 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
			<div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-800">
				<i className="fa-solid fa-pause" aria-hidden />
				{strings("page.sale.pause.title")}
			</div>
			<p className="mb-3 text-xs text-amber-800/80">
				{strings("page.sale.pause.desc")}
			</p>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
			>
				<i className="fa-solid fa-pause" aria-hidden />
				{strings("page.sale.pause.button")}
			</button>

			<Modal
				isOpen={open}
				onClose={() => !busy && setOpen(false)}
				title={strings("page.sale.pause.confirmTitle")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setOpen(false)}
							disabled={busy}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={() => run("paused")}
							disabled={busy}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
						>
							{busy ? (
								<i className="fa-solid fa-spinner fa-spin" aria-hidden />
							) : (
								<i className="fa-solid fa-pause" aria-hidden />
							)}
							{strings("page.sale.pause.button")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("page.sale.pause.confirmBody")}
				</p>
				{error && <p className="mt-2 text-xs text-red-600">{error}</p>}
			</Modal>
		</div>
	);
};

export default SalePauseZone;

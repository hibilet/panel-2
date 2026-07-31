import { useCallback, useEffect, useRef, useState } from "react";
import { get, post } from "../../lib/client";
import strings from "../../localization";
import { Modal } from "../shared";

// Cancelling an event is not a delete: it stops sales, refunds every paid order
// and voids every remaining ticket, mailing each holder. The API does that in a
// background sweep and answers 202, so this component has two jobs - take the
// decision (with the damage stated up front) and then show the sweep draining.
const POLL_MS = 3000;

const SaleCancelZone = ({ sale, onChanged }) => {
	const id = sale?.id ?? sale?._id;
	const cancelled = sale?.status === "cancelled";

	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);
	const [status, setStatus] = useState(null);
	const [error, setError] = useState(null);
	const timer = useRef(null);

	const fetchStatus = useCallback(async () => {
		if (!id) return null;
		try {
			const res = await get(`/sales/${id}/cancel-status`);
			setStatus(res.data ?? null);
			return res.data ?? null;
		} catch (err) {
			setError(err?.message ?? "status-failed");
			return null;
		}
	}, [id]);

	// Poll only while a sweep is actually running. A cancelled event with a
	// finished sweep is a static panel, and an active event polls nothing.
	useEffect(() => {
		if (!id || !cancelled) return undefined;
		let stopped = false;
		const tick = async () => {
			const data = await fetchStatus();
			if (stopped) return;
			if (data?.job?.running) timer.current = setTimeout(tick, POLL_MS);
		};
		tick();
		return () => {
			stopped = true;
			if (timer.current) clearTimeout(timer.current);
		};
	}, [id, cancelled, fetchStatus]);

	// Preview the damage when the dialog opens: how many paid orders get
	// refunded and how many tickets get voided.
	useEffect(() => {
		if (open && !cancelled) fetchStatus();
	}, [open, cancelled, fetchStatus]);

	const doCancel = async () => {
		setBusy(true);
		setError(null);
		try {
			await post(`/sales/${id}/cancel`, { reason: reason.trim() || undefined });
			setOpen(false);
			setReason("");
			onChanged?.();
		} catch (err) {
			setError(err?.message ?? strings("common.errorOccurred"));
		} finally {
			setBusy(false);
		}
	};

	const progress = status?.job?.progress;
	const running = !!status?.job?.running;

	if (cancelled) {
		return (
			<div className="mt-8 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
				<div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-800">
					<i className="fa-solid fa-ban" aria-hidden />
					{strings("page.sale.cancel.cancelledTitle")}
				</div>
				<p className="text-xs text-amber-800/80">
					{strings("page.sale.cancel.cancelledDesc")}
				</p>

				<div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-amber-900">
					<span>
						<i
							className={`fa-solid mr-2 ${running ? "fa-spinner fa-spin" : "fa-check"}`}
							aria-hidden
						/>
						{running
							? strings("page.sale.cancel.running")
							: strings("page.sale.cancel.done")}
					</span>
					{progress && (
						<>
							<span>
								{strings("page.sale.cancel.refunded", [progress.refunded ?? 0])}
							</span>
							<span>
								{strings("page.sale.cancel.voided", [
									(progress.cancelledFree ?? 0) +
										(progress.cancelledGiveaways ?? 0),
								])}
							</span>
							{progress.failed > 0 && (
								<span className="font-semibold text-red-700">
									{strings("page.sale.cancel.failed", [progress.failed])}
								</span>
							)}
						</>
					)}
				</div>

				{/* Failures are the one thing an organizer must act on: those buyers
				    still hold a ticket and their money. */}
				{progress?.errors?.length > 0 && (
					<ul className="mt-3 max-h-40 space-y-1 overflow-auto rounded border border-amber-200 bg-white/70 p-2 text-[11px] text-red-700">
						{progress.errors.map((e) => (
							<li key={e.id}>
								<span className="font-mono">{e.id}</span> — {e.error}
							</li>
						))}
					</ul>
				)}
			</div>
		);
	}

	return (
		<div className="mt-8 rounded-lg border border-red-200 bg-red-50/40 p-4">
			<div className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-700">
				<i className="fa-solid fa-ban" aria-hidden />
				{strings("page.sale.cancel.title")}
			</div>
			<p className="mb-3 text-xs text-red-700/80">
				{strings("page.sale.cancel.desc")}
			</p>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
			>
				<i className="fa-solid fa-ban" aria-hidden />
				{strings("page.sale.cancel.button")}
			</button>

			<Modal
				isOpen={open}
				onClose={() => !busy && setOpen(false)}
				title={strings("page.sale.cancel.confirmTitle")}
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
							onClick={doCancel}
							disabled={busy}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
						>
							{busy ? (
								<i className="fa-solid fa-spinner fa-spin" aria-hidden />
							) : (
								<i className="fa-solid fa-ban" aria-hidden />
							)}
							{strings("page.sale.cancel.button")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("page.sale.cancel.confirmBody")}
				</p>

				{/* State the damage in numbers - "refund everything" reads very
				    differently at 3 orders and at 900. */}
				<p className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
					{status
						? strings("page.sale.cancel.impact", [
								status.paidCount ?? 0,
								status.freeCount ?? 0,
							])
						: strings("common.loading")}
				</p>

				<label
					htmlFor="cancel-reason"
					className="mt-4 block text-xs font-medium text-slate-600"
				>
					{strings("page.sale.cancel.reason")}
				</label>
				<input
					id="cancel-reason"
					type="text"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder={strings("page.sale.cancel.reasonPlaceholder")}
					className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
				/>

				{error && <p className="mt-2 text-xs text-red-600">{error}</p>}
			</Modal>
		</div>
	);
};

export default SaleCancelZone;

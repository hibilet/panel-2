import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { Modal } from "../../../../components/shared";
import { get, post } from "../../../../lib/client";
import strings, { formatCurrency } from "../../../../localization";

const STATUS_LABELS = {
	success: strings("status.success"),
	pending: strings("status.pending"),
	failed: strings("status.failed"),
	refunded: strings("status.refunded"),
};

const STATUS_STYLES = {
	success: "bg-emerald-100 text-emerald-800",
	pending: "bg-amber-100 text-amber-800",
	failed: "bg-red-100 text-red-800",
	refunded: "bg-slate-100 text-slate-600",
};

const applyDiscount = (price, discount) => {
	const p = Number(price) || 0;
	const d = Number(discount);
	if (!Number.isFinite(d) || d <= 0) return p;
	if (d < 1) return p * (1 - d);
	return Math.max(0, p - d);
};

const formatDiscountLabel = (discount) => {
	const d = Number(discount);
	if (!Number.isFinite(d) || d <= 0) return null;
	if (d < 1) return `-${(d * 100).toFixed(0)}%`;
	return null;
};

const TransactionPanel = ({ id, onClose, onRefunded }) => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [sending, setSending] = useState(false);
	const [emailDialogOpen, setEmailDialogOpen] = useState(false);
	const [refundConfirm, setRefundConfirm] = useState(null);
	const [refundSubmitting, setRefundSubmitting] = useState(false);
	const [refunds, setRefunds] = useState([]);
	const [refundsLoading, setRefundsLoading] = useState(false);
	const [polling, setPolling] = useState(false);

	const loadRefunds = (silent = false) => {
		if (!silent) setRefundsLoading(true);
		return get(`/transactions/${id}/refunds`)
			.then((res) => {
				const list = res.data?.refunds ?? [];
				setRefunds(list);
				return list;
			})
			.catch(() => {
				if (!silent) setRefunds([]);
				return null;
			})
			.finally(() => {
				if (!silent) setRefundsLoading(false);
			});
	};

	const reloadTransaction = () =>
		get(`/transactions/${id}`)
			.then((res) => setData(res.data ?? null))
			.catch(() => {});

	useEffect(() => {
		setLoading(true);
		setError(null);
		get(`/transactions/${id}`)
			.then((res) => setData(res.data ?? null))
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadTransaction")),
			)
			.finally(() => setLoading(false));
		loadRefunds().then((list) => {
			if (list && list.some((r) => r.status === "pending")) setPolling(true);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	useEffect(() => {
		if (!polling) return;
		const tick = async () => {
			const list = await loadRefunds(true);
			await reloadTransaction();
			const stillPending = list?.some((r) => r.status === "pending");
			if (!stillPending) {
				setPolling(false);
				onRefunded?.();
			}
		};
		const handle = setInterval(tick, 2000);
		return () => clearInterval(handle);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [polling, id]);

	const handleSendEmailAgain = () => {
		setSending(true);
		post(`/transactions/${id}/resend-email`, {})
			.finally(() => setSending(false));
	};

	const handleSendToAnotherEmail = () => {
		setEmailDialogOpen(true);
	};

	const reservations = data?.reservations ?? [];
	const currency = data?.sale?.currency ?? "eur";

	const reservationFinalPrice = (r) => applyDiscount(r.price, r.discount);

	const totalAmount = reservations.reduce(
		(s, r) => s + reservationFinalPrice(r),
		0,
	);

	const startRefundAll = () => {
		setRefundConfirm({ type: "all", amount: totalAmount });
	};

	const startRefundOne = (reservation) => (e) => {
		e.stopPropagation();
		setRefundConfirm({
			type: "one",
			reservation,
			amount: reservationFinalPrice(reservation),
		});
	};

	const executeRefund = () => {
		if (!refundConfirm || refundSubmitting) return;
		const body = {};
		if (refundConfirm.type === "one") {
			if (!refundConfirm.reservation?.id) return;
			body.reservationIds = [refundConfirm.reservation.id];
		}
		setRefundSubmitting(true);
		post(`/transactions/${id}/refund`, body)
			.then(async () => {
				setRefundConfirm(null);
				await Promise.all([reloadTransaction(), loadRefunds()]);
				onRefunded?.();
				setPolling(true);
			})
			.catch(() => {})
			.finally(() => setRefundSubmitting(false));
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h2 className="text-lg font-semibold text-slate-900">
					{strings("page.transactions.details")}
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 active:bg-slate-100"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-xl" aria-hidden />
				</button>
			</header>

			<div className="flex-1 overflow-y-auto p-6">
				{loading ? (
					<div className="flex flex-col gap-4">
						<div className="h-10 w-48 animate-pulse rounded bg-slate-200" />
						<div className="h-64 animate-pulse rounded-lg bg-slate-100" />
					</div>
				) : error ? (
					<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
						{error}
					</div>
				) : data ? (
					<div className="space-y-6">
						<section className="flex flex-wrap items-center justify-between gap-4">
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={handleSendEmailAgain}
									disabled={sending}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{sending ? (
										<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									) : (
										<i className="fa-solid fa-envelope" aria-hidden />
									)}
									{strings("form.transaction.sendEmailAgain")}
								</button>
								<button
									type="button"
									onClick={handleSendToAnotherEmail}
									disabled={sending}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<i
										className="fa-solid fa-envelope-circle-check"
										aria-hidden
									/>
									{strings("form.transaction.sendToAnotherMail")}
								</button>
								<button
									type="button"
									onClick={startRefundAll}
									disabled={
										sending ||
										refundSubmitting ||
										reservations.length === 0 ||
										data?.status !== "success"
									}
									className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<i className="fa-solid fa-rotate-left" aria-hidden />
									{strings("form.transaction.refundAll")}
								</button>
							</div>
						</section>

						<section>
							<h3 className="mb-3 text-sm font-semibold text-slate-700">
								{strings("form.transaction.sale")}
							</h3>
							<Link
								className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm mb-4"
								href={`/sales/${data?.sale?.id}`}
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="text-base font-semibold text-slate-900">
										{data?.sale?.name ?? "—"}
									</div>
									<div className="text-sm text-slate-600">
										{data?.sale?.start
											? dayjs(data.sale.start).format("D MMM YYYY, HH:mm")
											: "—"}
									</div>
								</div>
							</Link>
							<h3 className="mb-3 text-sm font-semibold text-slate-700">
								{strings("form.transaction.reservations")}
							</h3>
							{reservations.length === 0 ? (
								<p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
									{strings("form.transaction.noReservations")}
								</p>
							) : (
								<div className="grid gap-3">
									{reservations.map((r) => (
										<div
											key={r.id}
											className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
										>
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="font-medium text-slate-900">
														{r.name ?? r.category ?? "—"}
													</p>
													{r.category && r.category !== r.name && (
														<p className="text-sm text-slate-500">
															{r.category}
														</p>
													)}
												</div>
												<span
													className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
														STATUS_STYLES[r.status] ??
														"bg-slate-100 text-slate-600"
													}`}
												>
													{STATUS_LABELS[r.status] ?? r.status ?? "—"}
												</span>
											</div>
											<div className="flex justify-between gap-4 text-sm text-slate-600">
												<span className="flex items-center gap-2">
													{r.price != null ? (
														(() => {
															const final = reservationFinalPrice(r);
															const hasDiscount =
																Number(r.discount) > 0 && final !== Number(r.price);
															const label = formatDiscountLabel(r.discount);
															return hasDiscount ? (
																<>
																	<span className="font-medium text-slate-900">
																		{formatCurrency(final, currency)}
																	</span>
																	<span className="text-slate-400 line-through">
																		{formatCurrency(r.price, currency)}
																	</span>
																	{label && (
																		<span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
																			{label}
																		</span>
																	)}
																</>
															) : (
																<span>
																	{formatCurrency(r.price, currency)}
																</span>
															);
														})()
													) : (
														"—"
													)}
												</span>
												<span>
													{r.createdAt
														? dayjs(r.createdAt).format("DD MMM YYYY, HH:mm")
														: "—"}
												</span>
											</div>
											<div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
												<button
													type="button"
													onClick={startRefundOne(r)}
													disabled={
														refundSubmitting ||
														r.status === "refunded" ||
														!r.price
													}
													className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<i className="fa-solid fa-rotate-left" aria-hidden />
													{strings("form.transaction.refund")}
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</section>

						<section>
							<div className="mb-3 flex items-center justify-between">
								<h3 className="text-sm font-semibold text-slate-700">
									{strings("form.transaction.refundHistory")}
								</h3>
								{refunds.length > 0 && (
									<span className="text-sm text-slate-600">
										{strings("form.transaction.refundedTotal", [
											formatCurrency(
												refunds.reduce((s, r) => s + (r.amount ?? 0), 0) / 100,
												data?.sale?.currency ?? "eur",
											),
										])}
									</span>
								)}
							</div>
							{refundsLoading ? (
								<div className="h-12 animate-pulse rounded-lg bg-slate-100" />
							) : refunds.length === 0 ? (
								<p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
									{strings("form.transaction.refundHistoryEmpty")}
								</p>
							) : (
								<div className="grid gap-2">
									{refunds.map((r) => (
										<div
											key={r.id}
											className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
										>
											<div className="flex flex-col">
												<span className="font-medium text-slate-900">
													{formatCurrency(
														(r.amount ?? 0) / 100,
														data?.sale?.currency ?? "eur",
													)}
												</span>
												{r.reason && (
													<span className="text-xs text-slate-500">{r.reason}</span>
												)}
											</div>
											<div className="flex items-center gap-2">
												<span
													className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
														r.status === "succeeded"
															? "bg-emerald-100 text-emerald-800"
															: r.status === "failed"
																? "bg-red-100 text-red-800"
																: "bg-amber-100 text-amber-800"
													}`}
												>
													{r.status ?? "—"}
												</span>
												<span className="text-xs text-slate-500">
													{r.created
														? dayjs(r.created * 1000).format("DD MMM YYYY, HH:mm")
														: "—"}
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</section>

						<code className="block max-h-64 overflow-auto whitespace-pre rounded-lg border border-slate-200 bg-slate-100 p-4 text-xs text-slate-700">
							{JSON.stringify(
								{
									owner: data.owner,
									sale: data.sale,
									status: data.status,
									conversation: data.conversation,
									createdAt: data.createdAt,
									updatedAt: data.updatedAt,
									billing: data.billing,
									basket: data.basket,
									reservations: data.reservations,
									venue: data.venue,
									id: data.id,
								},
								null,
								2,
							)}
						</code>
					</div>
				) : null}
			</div>

			<Modal
				isOpen={!!refundConfirm}
				onClose={() => (refundSubmitting ? null : setRefundConfirm(null))}
				title={
					refundConfirm?.type === "all"
						? strings("confirm.refundTransaction")
						: strings("confirm.refundReservation")
				}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setRefundConfirm(null)}
							disabled={refundSubmitting}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={executeRefund}
							disabled={refundSubmitting}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-700 disabled:opacity-50"
						>
							{refundSubmitting && (
								<i className="fa-solid fa-spinner fa-spin" aria-hidden />
							)}
							{strings("common.confirm")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{refundConfirm?.type === "all"
						? strings("confirm.refundTransactionBody", [
								formatCurrency(refundConfirm?.amount ?? 0, currency),
							])
						: strings("confirm.refundReservationBody", [
								formatCurrency(refundConfirm?.amount ?? 0, currency),
							])}
				</p>
			</Modal>

			{emailDialogOpen && (
				<SendEmailDialog
					transactionId={id}
					initialEmail={data?.owner?.email ?? ""}
					onClose={() => setEmailDialogOpen(false)}
					setSending={setSending}
				/>
			)}
		</div>
	);
};

const SendEmailDialog = ({ transactionId, initialEmail, onClose, setSending }) => {
	const [sending, setSendingLocal] = useState(false);
	const { register, handleSubmit, reset } = useForm({
		defaultValues: { emailAddress: initialEmail ?? "" },
	});

	useEffect(() => {
		reset({ emailAddress: initialEmail ?? "" });
	}, [initialEmail, reset]);

	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	const onSubmit = ({ emailAddress }) => {
		if (!transactionId || !emailAddress?.trim()) return;
		setSendingLocal(true);
		setSending?.(true);
		post(`/transactions/${transactionId}/resend-email-alternate`, {
			emailAddress: emailAddress.trim(),
		})
			.then(() => onClose())
			.finally(() => {
				setSendingLocal(false);
				setSending?.(false);
			});
	};

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="send-email-dialog-title"
		>
			<div
				className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
				aria-hidden
				onClick={onClose}
			/>
			<article className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
				<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h2
						id="send-email-dialog-title"
						className="text-lg font-semibold text-slate-900"
					>
						{strings("form.transaction.sendToAnotherAddress")}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 active:bg-slate-100"
						aria-label={strings("common.ariaClose")}
					>
						<i className="fa-solid fa-xmark text-lg" aria-hidden />
					</button>
				</header>
				<form
					id="send-email-form"
					onSubmit={handleSubmit(onSubmit)}
					className="p-4"
				>
					<label className="block">
						<span className="mb-1.5 block text-sm font-medium text-slate-700">
							{strings("form.transaction.email")}
						</span>
						<input
							type="email"
							{...register("emailAddress")}
							placeholder="Eg: john@doe.com"
							className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						/>
					</label>
				</form>
				<footer className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{strings("common.cancel")}
					</button>
					<button
						type="submit"
						form="send-email-form"
						disabled={sending}
						className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{sending ? (
							<i className="fa-solid fa-spinner fa-spin" aria-hidden />
						) : (
							<i className="fa-solid fa-envelope" aria-hidden />
						)}
						{strings("form.transaction.sendEmail")}
					</button>
				</footer>
			</article>
		</div>
	);
};

export default TransactionPanel;

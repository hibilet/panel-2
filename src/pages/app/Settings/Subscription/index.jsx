import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Modal } from "../../../../components/shared";
import DataTable from "../../../../components/tables/DataTable";
import { get, post } from "../../../../lib/client";
import strings, { formatCurrency } from "../../../../localization";

const SELECT_ERROR_KEYS = {
	"tier-required": "page.subscription.error.tierRequired",
	"tier-not-found": "page.subscription.error.tierNotFound",
	"already-has-subscription": "page.subscription.error.alreadySubscribed",
};

const mapSelectError = (msg) => {
	const key = SELECT_ERROR_KEYS[msg];
	return key ? strings(key) : (msg ?? strings("error.failedSave"));
};

const Subscription = () => {
	const [, setLocation] = useLocation();
	const [tiers, setTiers] = useState([]);
	const [subscription, setSubscription] = useState(undefined);
	const [billing, setBilling] = useState(undefined);
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [error, setError] = useState(null);
	const [submitting, setSubmitting] = useState(null);
	const [confirmTier, setConfirmTier] = useState(null);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [cancelPendingOpen, setCancelPendingOpen] = useState(false);
	const [cancellingPending, setCancellingPending] = useState(false);
	const [accessCode, setAccessCode] = useState("");
	const [redeeming, setRedeeming] = useState(false);

	const fetchData = useCallback(async (silent = false) => {
		if (!silent) setLoading(true);
		setError(null);
		try {
			const [tiersRes, subRes, billingRes] = await Promise.all([
				get("/tiers/public").catch(() => get("/tiers")),
				get("/tiers/subscription").catch(() => ({ data: null })),
				get("/billings/my").catch(() => ({ data: null })),
			]);
			setTiers(tiersRes.data ?? []);
			setSubscription(subRes.data ?? null);
			setBilling(billingRes.data ?? null);
		} catch (err) {
			if (!silent) setError(err?.message ?? strings("error.failedLoadSubscription"));
		} finally {
			if (!silent) setLoading(false);
		}
	}, []);

	const fetchHistory = useCallback(async () => {
		setHistoryLoading(true);
		try {
			const res = await get("/tiers/subscription/history?limit=25&skip=0");
			setHistory(res.data?.subscriptions ?? []);
		} catch {
			// non-critical
		} finally {
			setHistoryLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
		fetchHistory();
	}, [fetchData, fetchHistory]);

	const currentTier = subscription?.tier ?? null;
	const pendingChange = subscription?.pendingChange ?? null;
	const hasPendingDowngrade =
		subscription?.status === "pending_downgrade" && pendingChange?.tier;

	const activeTiers = tiers.filter(
		(t) => t.status !== "inactive" && t.visibility !== "private",
	);

	const getTierAction = (tier) => {
		if (!currentTier) return "subscribe";
		if (tier.uuid === currentTier.uuid) return "current";
		if ((tier.baseFee ?? 0) > (currentTier.baseFee ?? 0)) return "upgrade";
		if ((tier.baseFee ?? 0) < (currentTier.baseFee ?? 0)) return "downgrade";
		return "same";
	};

	const billingMissing = billing === null;

	const handleSelectClick = (tier) => {
		if (billingMissing) return;
		const action = getTierAction(tier);
		if (action === "current" || action === "same") return;
		setConfirmTier(tier);
	};

	const routeToInvoice = (invoice) => {
		const id = invoice?.uuid ?? invoice?.id ?? invoice?._id;
		if (id) setLocation(`/invoices/${id}`);
	};

	const handleConfirmSelect = async () => {
		if (!confirmTier) return;
		const tier = confirmTier;
		setSubmitting(tier.uuid);
		setConfirmTier(null);
		setError(null);
		try {
			const res = await post("/tiers/select", { tierId: tier.uuid });
			await fetchData(true);
			await fetchHistory();
			// Prefer routing to the draft (projection of next month) so the merchant
			// sees what they will be billed before the period closes; fallback to setup invoice.
			if (res?.data?.draft) routeToInvoice(res.data.draft);
			else if (res?.data?.invoice) routeToInvoice(res.data.invoice);
		} catch (err) {
			setError(mapSelectError(err?.message));
		} finally {
			setSubmitting(null);
		}
	};

	const handleRedeemAccessCode = async (e) => {
		e.preventDefault();
		const code = accessCode.trim();
		if (!code) return;
		setRedeeming(true);
		setError(null);
		try {
			const lookup = await get(
				`/tiers/by-access-code/${encodeURIComponent(code)}`,
			).catch(() => ({ data: null }));
			if (!lookup?.data) {
				setError(strings("page.subscription.error.invalidCode"));
				return;
			}
			const res = await post("/tiers/select", { accessCode: code });
			setAccessCode("");
			await fetchData(true);
			await fetchHistory();
			if (res?.data?.draft) routeToInvoice(res.data.draft);
			else if (res?.data?.invoice) routeToInvoice(res.data.invoice);
		} catch (err) {
			setError(mapSelectError(err?.message));
		} finally {
			setRedeeming(false);
		}
	};

	const handleCancel = async () => {
		setCancelling(true);
		setError(null);
		try {
			await post("/tiers/cancel");
			setCancelOpen(false);
			await fetchData(true);
			await fetchHistory();
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setCancelling(false);
		}
	};

	const handleCancelPending = async () => {
		setCancellingPending(true);
		setError(null);
		try {
			await post("/tiers/cancel-pending");
			setCancelPendingOpen(false);
			await fetchData(true);
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setCancellingPending(false);
		}
	};

	const formatCommission = (t) => {
		if (!t?.commission) return "-";
		const { amount, type } = t.commission;
		if (type === "percentage") return `${(amount * 100).toFixed(1)}%`;
		return formatCurrency(amount ?? 0);
	};

	const historyColumns = [
		{
			key: "plan",
			header: strings("table.subscription.plan"),
			headerCell: true,
			render: (r) => r.tier?.name ?? "-",
		},
		{
			key: "period",
			header: strings("table.subscription.period"),
			render: (r) => {
				const start = r.startDate ? dayjs(r.startDate).format("D MMM YYYY") : "-";
				const end = r.endDate
					? dayjs(r.endDate).format("D MMM YYYY")
					: strings("common.present");
				return `${start} - ${end}`;
			},
		},
		{
			key: "type",
			header: strings("table.subscription.type"),
			render: (r) => r.transition?.type ?? "-",
		},
		{
			key: "installFee",
			header: strings("table.subscription.installFee"),
			align: "right",
			render: (r) => formatCurrency(r.installFee?.amount ?? 0),
		},
		{
			key: "status",
			header: strings("table.subscription.status"),
			render: (r) => (
				<span
					className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
						r.status === "active"
							? "bg-emerald-100 text-emerald-800"
							: r.status === "pending_downgrade"
								? "bg-amber-100 text-amber-800"
								: r.status === "expired"
									? "bg-slate-100 text-slate-600"
									: "bg-red-100 text-red-800"
					}`}
				>
					{r.status ?? "-"}
				</span>
			),
		},
	];

	const confirmAction = confirmTier ? getTierAction(confirmTier) : null;
	const installFee = confirmTier?.installFee?.amount ?? 0;

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<Link
				href="/settings"
				className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.settings")}
			</Link>

			<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900">
					<i className="fa-solid fa-layer-group text-slate-600" aria-hidden />
					{strings("page.subscription.title")}
				</h1>

				{error && (
					<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
						{error}
					</div>
				)}

				{loading ? (
					<div className="flex justify-center py-12">
						<i className="fa-solid fa-spinner fa-spin text-3xl text-slate-400" aria-hidden />
					</div>
				) : (
					<>
						{/* Current plan */}
						<section className="mb-8">
							<h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
								{strings("page.subscription.currentTier")}
							</h2>
							{currentTier ? (
								<div className="rounded-lg border-2 border-slate-900 bg-slate-50 p-4">
									{hasPendingDowngrade && (
										<div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
											<div>
												<p className="text-sm font-medium text-amber-800">
													<i className="fa-solid fa-clock mr-1.5" aria-hidden />
													{strings("page.subscription.pendingDowngrade", [
														pendingChange.tier.name,
													])}
												</p>
												{pendingChange.requestedAt && (
													<p className="mt-0.5 text-xs text-amber-700">
														{strings("page.subscription.pendingDowngradeAt", [
															dayjs(pendingChange.requestedAt).format("D MMM YYYY"),
														])}
													</p>
												)}
											</div>
											<button
												type="button"
												onClick={() => setCancelPendingOpen(true)}
												className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
											>
												{strings("page.subscription.cancelPending")}
											</button>
										</div>
									)}
									<div className="flex items-start justify-between gap-4">
										<div>
											<p className="text-lg font-semibold text-slate-900">
												{currentTier.name}
											</p>
											{currentTier.description && (
												<p className="mt-0.5 text-sm text-slate-500">
													{currentTier.description}
												</p>
											)}
											{subscription?.startDate && (
												<p className="mt-2 text-xs text-slate-400">
													{strings("page.subscription.startedAt", [
														dayjs(subscription.startDate).format("D MMM YYYY"),
													])}
												</p>
											)}
											{subscription?.nextInvoiceAt && (
												<p className="mt-1 text-xs text-slate-400">
													{strings("page.subscription.nextInvoiceAt", [
														dayjs(subscription.nextInvoiceAt).format("D MMM YYYY"),
													])}
												</p>
											)}
										</div>
										<div className="text-right">
											<p className="text-xl font-bold text-slate-900">
												{formatCurrency(currentTier.baseFee ?? 0)}
												<span className="text-sm font-normal text-slate-500">
													{strings("page.subscription.perMonth")}
												</span>
											</p>
											<p className="mt-1 text-sm text-slate-500">
												{strings("page.subscription.commission")}:{" "}
												{formatCommission(currentTier)}
											</p>
											{(currentTier.perTicketFee ?? 0) > 0 && (
												<p className="mt-1 text-sm text-slate-500">
													{strings("page.subscription.perTicketFee")}:{" "}
													{formatCurrency(currentTier.perTicketFee)}/{strings("page.subscription.ticket")}
												</p>
											)}
										</div>
									</div>
									<div className="mt-4 flex justify-end">
										<button
											type="button"
											onClick={() => setCancelOpen(true)}
											className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{strings("page.subscription.cancel")}
										</button>
									</div>
								</div>
							) : (
								<div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
									<p className="flex items-center gap-2 text-sm font-medium text-amber-900">
										<i className="fa-solid fa-circle-exclamation" aria-hidden />
										{strings("page.subscription.noTierPrompt")}
									</p>
									<p className="mt-1 text-xs text-amber-800">
										{strings("page.subscription.noTierHint")}
									</p>
								</div>
							)}
						</section>

						{/* Available plans */}
						<section className="mb-8">
							<h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
								{currentTier
									? strings("page.subscription.availableTiers")
									: strings("page.subscription.selectYourTier")}
							</h2>
							{billingMissing && (
								<div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
									<div>
										<p className="flex items-center gap-2 text-sm font-medium text-amber-900">
											<i className="fa-solid fa-circle-exclamation" aria-hidden />
											{strings("page.subscription.billingRequired")}
										</p>
										<p className="mt-0.5 text-xs text-amber-800">
											{strings("page.subscription.billingRequiredHint")}
										</p>
									</div>
									<Link
										href="/settings/billing"
										className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
									>
										{strings("page.settings.billingSetup")}
									</Link>
								</div>
							)}
							{activeTiers.length === 0 ? (
								<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
									{strings("page.subscription.noPublicTiers")}
								</div>
							) : (
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{activeTiers.map((tier) => {
										const action = getTierAction(tier);
										const isLoading = submitting === tier.uuid;
										const isPendingTier = pendingChange?.tierUuid === tier.uuid;
										const tierInstallFee = tier.installFee?.amount ?? 0;

										return (
											<div
												key={tier.uuid ?? tier._id}
												className={`flex flex-col rounded-lg border p-4 transition-colors ${
													action === "current"
														? "border-slate-900 bg-slate-50"
														: tier.isDefault
															? "border-emerald-300 bg-emerald-50/30 hover:border-emerald-400"
															: "border-slate-200 bg-white hover:border-slate-400"
												}`}
											>
												<div className="mb-3">
													<div className="flex items-center gap-2">
														<p className="font-semibold text-slate-900">{tier.name}</p>
														{tier.isDefault && (
															<span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
																{strings("page.subscription.defaultBadge")}
															</span>
														)}
													</div>
													{tier.description && (
														<p className="mt-0.5 text-xs text-slate-500">
															{tier.description}
														</p>
													)}
												</div>
												<div className="mb-3 flex-1 space-y-1 text-sm">
													<div className="flex justify-between">
														<span className="text-slate-500">
															{strings("page.subscription.baseFee")}
														</span>
														<span className="font-medium">
															{formatCurrency(tier.baseFee ?? 0)}
															<span className="text-xs text-slate-400">
																{strings("page.subscription.perMonth")}
															</span>
														</span>
													</div>
													<div className="flex justify-between">
														<span className="text-slate-500">
															{strings("page.subscription.commission")}
														</span>
														<span className="font-medium">{formatCommission(tier)}</span>
													</div>
													{(tier.perTicketFee ?? 0) > 0 && (
														<div className="flex justify-between">
															<span className="text-slate-500">
																{strings("page.subscription.perTicketFee")}
															</span>
															<span className="font-medium">
																{formatCurrency(tier.perTicketFee)}/{strings("page.subscription.ticket")}
															</span>
														</div>
													)}
													{tierInstallFee > 0 && (
														<div className="flex justify-between">
															<span className="text-slate-500">
																{strings("page.subscription.installFee")}
															</span>
															<span className="font-medium">
																{formatCurrency(tierInstallFee)}
															</span>
														</div>
													)}
													<div className="flex justify-between">
														<span className="text-slate-500">
															{strings("page.subscription.saleLimit")}
														</span>
														<span className="font-medium">
															{tier.saleLimit
																? tier.saleLimit.toLocaleString()
																: strings("page.subscription.unlimited")}
														</span>
													</div>
													{(tier.reservationLimit ?? 0) > 0 && (
														<div className="flex justify-between">
															<span className="text-slate-500">
																{strings("page.subscription.reservationLimit")}
															</span>
															<span className="font-medium">
																{tier.reservationLimit.toLocaleString()} {strings("page.subscription.tickets")}
															</span>
														</div>
													)}
												</div>

												{action === "current" ? (
													<span className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
														<i className="fa-solid fa-check mr-1.5" aria-hidden />
														{strings("common.active")}
													</span>
												) : isPendingTier ? (
													<span className="inline-flex w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
														<i className="fa-solid fa-clock mr-1.5" aria-hidden />
														{strings("page.subscription.downgradeQueued")}
													</span>
												) : action === "same" ? (
													<span className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-400">
														{strings("page.subscription.sameTier")}
													</span>
												) : (
													<button
														type="button"
														onClick={() => handleSelectClick(tier)}
														disabled={!!submitting || billingMissing}
														title={billingMissing ? strings("page.subscription.billingRequired") : undefined}
														className={`inline-flex w-full items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
															action === "upgrade"
																? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
																: action === "downgrade"
																	? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
																	: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
														}`}
													>
														{isLoading ? (
															<>
																<i className="fa-solid fa-spinner fa-spin mr-1.5" aria-hidden />
																{strings("page.subscription.subscribing")}
															</>
														) : action === "upgrade" ? (
															<>
																<i className="fa-solid fa-arrow-up mr-1.5" aria-hidden />
																{strings("page.subscription.upgrade")}
															</>
														) : action === "downgrade" ? (
															<>
																<i className="fa-solid fa-arrow-down mr-1.5" aria-hidden />
																{strings("page.subscription.downgrade")}
															</>
														) : (
															strings("page.subscription.subscribe")
														)}
													</button>
												)}
											</div>
										);
									})}
								</div>
							)}
						</section>

						{/* Access code (private tiers) */}
						{!currentTier && (
							<section>
								<h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
									{strings("page.subscription.accessCodeTitle")}
								</h2>
								<form
									onSubmit={handleRedeemAccessCode}
									className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
								>
									<label className="flex-1">
										<span className="mb-1 block text-xs font-medium text-slate-600">
											{strings("page.subscription.accessCodeLabel")}
										</span>
										<input
											type="text"
											value={accessCode}
											onChange={(e) => setAccessCode(e.target.value)}
											placeholder={strings("page.subscription.accessCodePlaceholder")}
											className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
											disabled={redeeming || billingMissing}
										/>
									</label>
									<button
										type="submit"
										disabled={redeeming || !accessCode.trim() || billingMissing}
										title={billingMissing ? strings("page.subscription.billingRequired") : undefined}
										className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{redeeming ? (
											<>
												<i className="fa-solid fa-spinner fa-spin" aria-hidden />
												{strings("page.subscription.redeeming")}
											</>
										) : (
											strings("page.subscription.redeem")
										)}
									</button>
								</form>
							</section>
						)}
					</>
				)}
			</div>

			{/* Subscription history */}
			{!loading && history.length > 0 && (
				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-200 px-6 py-4">
						<h2 className="text-base font-semibold text-slate-900">
							{strings("page.subscription.history")}
						</h2>
					</div>
					<DataTable
						data={history}
						columns={historyColumns}
						getRowKey={(r) => r.uuid}
						bare
						loading={historyLoading}
						emptyMessage={strings("page.subscription.historyEmpty")}
					/>
				</div>
			)}

			{/* Confirm subscribe / upgrade / downgrade */}
			<Modal
				isOpen={!!confirmTier}
				onClose={() => setConfirmTier(null)}
				title={
					confirmAction === "upgrade"
						? strings("page.subscription.upgrade")
						: confirmAction === "downgrade"
							? strings("page.subscription.downgrade")
							: strings("page.subscription.subscribe")
				}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setConfirmTier(null)}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleConfirmSelect}
							disabled={!!submitting}
							className={`inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
								confirmAction === "downgrade"
									? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-400 active:bg-amber-700"
									: "bg-slate-900 hover:bg-slate-800 focus:ring-slate-400 active:bg-slate-800"
							}`}
						>
							{submitting ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("page.subscription.subscribing")}
								</>
							) : confirmAction === "upgrade" ? (
								strings("page.subscription.upgrade")
							) : confirmAction === "downgrade" ? (
								strings("page.subscription.downgrade")
							) : (
								strings("page.subscription.subscribe")
							)}
						</button>
					</div>
				}
			>
				{confirmTier && (
					<div className="space-y-3 text-sm text-slate-600">
						<p className="font-medium text-slate-900">{confirmTier.name}</p>
						<p>
							{strings("page.subscription.baseFee")}:{" "}
							<strong>
								{formatCurrency(confirmTier.baseFee ?? 0)}
								{strings("page.subscription.perMonth")}
							</strong>
						</p>
						{installFee > 0 && (
							<p>
								{strings("page.subscription.installFee")}:{" "}
								<strong>{formatCurrency(installFee)}</strong>
								<span className="ml-1 text-xs text-slate-500">
									{strings("page.subscription.installFeeNote")}
								</span>
							</p>
						)}
						{confirmAction === "upgrade" && (
							<p className="text-emerald-700">
								<i className="fa-solid fa-bolt mr-1" aria-hidden />
								{strings("page.subscription.upgradeNote")}
							</p>
						)}
						{confirmAction === "downgrade" && (
							<p className="text-amber-700">
								<i className="fa-solid fa-clock mr-1" aria-hidden />
								{strings("page.subscription.downgradeNote")}
							</p>
						)}
					</div>
				)}
			</Modal>

			{/* Cancel subscription */}
			<Modal
				isOpen={cancelOpen}
				onClose={() => setCancelOpen(false)}
				title={strings("page.subscription.cancel")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setCancelOpen(false)}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleCancel}
							disabled={cancelling}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{cancelling ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("page.subscription.cancelling")}
								</>
							) : (
								strings("page.subscription.cancel")
							)}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("confirm.cancelSubscription")}
				</p>
			</Modal>

			{/* Cancel pending downgrade */}
			<Modal
				isOpen={cancelPendingOpen}
				onClose={() => setCancelPendingOpen(false)}
				title={strings("page.subscription.cancelPending")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setCancelPendingOpen(false)}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleCancelPending}
							disabled={cancellingPending}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{cancellingPending ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("page.subscription.cancellingPending")}
								</>
							) : (
								strings("page.subscription.cancelPending")
							)}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("confirm.cancelPending")}
				</p>
			</Modal>
		</div>
	);
};

export default Subscription;

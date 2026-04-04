import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Modal } from "../../../../components/shared";
import DataTable from "../../../../components/tables/DataTable";
import { get, post } from "../../../../lib/client";
import strings, { formatCurrency } from "../../../../localization";

const Subscription = () => {
	const [tiers, setTiers] = useState([]);
	const [subscription, setSubscription] = useState(undefined);
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [error, setError] = useState(null);
	const [subscribing, setSubscribing] = useState(null);
	const [confirmTier, setConfirmTier] = useState(null);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [cancelPendingOpen, setCancelPendingOpen] = useState(false);
	const [cancellingPending, setCancellingPending] = useState(false);

	const fetchData = useCallback(async (silent = false) => {
		if (!silent) setLoading(true);
		setError(null);
		try {
			const [tiersRes, subRes] = await Promise.all([
				get("/tiers"),
				get("/tiers/subscription").catch(() => ({ data: null })),
			]);
			setTiers(tiersRes.data ?? []);
			setSubscription(subRes.data ?? null);
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
			// history is non-critical
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

	const activeTiers = tiers.filter((t) => t.status === "active");

	const getTierAction = (tier) => {
		if (!currentTier) return "subscribe";
		if (tier.uuid === currentTier.uuid) return "current";
		if (tier.baseFee > currentTier.baseFee) return "upgrade";
		if (tier.baseFee < currentTier.baseFee) return "downgrade";
		return "same";
	};

	const handleSubscribeClick = (tier) => {
		const action = getTierAction(tier);
		if (action === "current" || action === "same" || tier.exclusive) return;
		setConfirmTier(tier);
	};

	const handleConfirmSubscribe = async () => {
		if (!confirmTier) return;
		const tier = confirmTier;
		setSubscribing(tier.uuid);
		setConfirmTier(null);
		setError(null);
		try {
			await post("/tiers/subscribe", { uuid: tier.uuid });
			await fetchData(true);
			await fetchHistory();
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSubscribing(null);
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
		if (!t?.commission) return "—";
		const { amount, type } = t.commission;
		if (type === "percentage") return `${(amount * 100).toFixed(1)}%`;
		return formatCurrency(amount ?? 0);
	};

	const historyColumns = [
		{
			key: "plan",
			header: strings("table.subscription.plan"),
			headerCell: true,
			render: (r) => r.tier?.name ?? "—",
		},
		{
			key: "period",
			header: strings("table.subscription.period"),
			render: (r) => {
				const start = r.startDate ? dayjs(r.startDate).format("D MMM YYYY") : "—";
				const end = r.endDate
					? dayjs(r.endDate).format("D MMM YYYY")
					: strings("common.present");
				return `${start} – ${end}`;
			},
		},
		{
			key: "type",
			header: strings("table.subscription.type"),
			render: (r) => r.transition?.type ?? "—",
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
					{r.status ?? "—"}
				</span>
			),
		},
	];

	const confirmAction = confirmTier ? getTierAction(confirmTier) : null;

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
					<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
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
										</div>
									</div>
									<div className="mt-4 flex justify-end">
										<button
											type="button"
											onClick={() => setCancelOpen(true)}
											className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
										>
											{strings("page.subscription.cancel")}
										</button>
									</div>
								</div>
							) : (
								<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
									{strings("page.subscription.noTier")}
								</div>
							)}
						</section>

						{/* Available plans */}
						<section>
							<h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
								{strings("page.subscription.availableTiers")}
							</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{activeTiers.map((tier) => {
									const action = getTierAction(tier);
									const isLoading = subscribing === tier.uuid;
									const isPendingTier = pendingChange?.tierUuid === tier.uuid;

									return (
										<div
											key={tier.uuid ?? tier._id}
											className={`rounded-lg border p-4 transition-colors ${
												action === "current"
													? "border-slate-900 bg-slate-50"
													: "border-slate-200 bg-white hover:border-slate-400"
											}`}
										>
											<div className="mb-3">
												<p className="font-semibold text-slate-900">{tier.name}</p>
												{tier.description && (
													<p className="mt-0.5 text-xs text-slate-500">
														{tier.description}
													</p>
												)}
												{tier.exclusive && (
													<p className="mt-1 text-xs text-amber-600">
														<i className="fa-solid fa-lock mr-1" aria-hidden />
														{strings("page.subscription.exclusiveNote")}
													</p>
												)}
											</div>
											<div className="mb-3 space-y-1 text-sm">
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
											) : tier.exclusive ? (
												<span className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-400">
													<i className="fa-solid fa-lock mr-1.5" aria-hidden />
													{strings("page.subscription.exclusiveNote")}
												</span>
											) : (
												<button
													type="button"
													onClick={() => handleSubscribeClick(tier)}
													disabled={!!subscribing}
													className={`inline-flex w-full items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
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
						</section>
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
							className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleConfirmSubscribe}
							disabled={!!subscribing}
							className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
								confirmAction === "downgrade"
									? "bg-amber-600 hover:bg-amber-700"
									: "bg-slate-900 hover:bg-slate-800"
							}`}
						>
							{subscribing ? (
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
							className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleCancel}
							disabled={cancelling}
							className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
							className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleCancelPending}
							disabled={cancellingPending}
							className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useApp } from "../../context";
import { get } from "../../lib/client";
import strings from "../../localization";

const STEPS = [
	{
		key: "agreements",
		href: "/settings/agreements",
		labelKey: "completionSteps.agreements",
		icon: "fa-file-contract",
	},
	{
		key: "providers",
		href: "/settings/providers",
		labelKey: "completionSteps.providers",
		icon: "fa-credit-card",
	},
	{
		key: "mailings",
		href: "/settings/mailing",
		labelKey: "completionSteps.mailings",
		icon: "fa-envelope",
	},
	{
		key: "billings",
		href: "/settings/billing",
		labelKey: "completionSteps.billing",
		icon: "fa-file-invoice",
	},
];

const TIER_STEP = {
	key: "subscription",
	href: "/settings/subscription",
	labelKey: "completionSteps.selectTier",
	icon: "fa-layer-group",
};

export const shouldShowCompletionWizard = (account) => {
	if (!account || account.type !== "account.merchant") return false;
	return STEPS.some(
		(step) =>
			account[step.key] === false || account[step.key] === undefined,
	);
};

const CompletionStepsWizard = () => {
	const { account } = useApp();
	const [hasSubscription, setHasSubscription] = useState(null);

	useEffect(() => {
		if (!account || account.type !== "account.merchant") return;
		let cancelled = false;
		get("/tiers/subscription")
			.then((res) => {
				if (!cancelled) setHasSubscription(!!res?.data);
			})
			.catch(() => {
				if (!cancelled) setHasSubscription(false);
			});
		return () => {
			cancelled = true;
		};
	}, [account]);

	if (!account || account.type !== "account.merchant") return null;

	const incompleteSteps = STEPS.filter((step) => {
		const value = account[step.key];
		return value === false || value === undefined;
	});

	const needsTier = hasSubscription === false;
	const allSteps = needsTier
		? [...incompleteSteps, TIER_STEP]
		: incompleteSteps;

	if (allSteps.length === 0) return null;

	return (
		<section
			className="rounded-xl border border-amber-200 bg-amber-50 p-6"
			aria-labelledby="completion-steps-heading"
		>
			<h2
				id="completion-steps-heading"
				className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-900"
			>
				<i className="fa-solid fa-list-check text-amber-600" aria-hidden />
				{strings("completionSteps.title")}
			</h2>
			<p className="mb-4 text-sm text-amber-800">
				{strings("completionSteps.description")}
			</p>
			<ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
				{allSteps.map((step, index) => {
					const isTier = step.key === "subscription";
					return (
						<li key={step.key} className="flex items-center gap-2">
							{index > 0 && (
								<span
									className="hidden text-amber-600 sm:inline"
									aria-hidden
								>
									›
								</span>
							)}
							<Link
								href={step.href}
								className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
									isTier
										? "border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400"
										: "border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:border-amber-400 focus:ring-amber-400"
								}`}
							>
								<i
									className={`fa-solid ${step.icon} ${
										isTier ? "text-white" : "text-amber-600"
									}`}
									aria-hidden
								/>
								{strings(step.labelKey)}
							</Link>
						</li>
					);
				})}
			</ol>
		</section>
	);
};

export default CompletionStepsWizard;

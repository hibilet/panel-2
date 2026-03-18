import { Link } from "wouter";
import { useApp } from "../../context";
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
];

export const shouldShowCompletionWizard = (account) => {
	if (!account || account.type !== "account.merchant") return false;
	return STEPS.some(
		(step) =>
			account[step.key] === false || account[step.key] === undefined,
	);
};

const CompletionStepsWizard = () => {
	const { account } = useApp();

	if (!account || account.type !== "account.merchant") return null;

	const incompleteSteps = STEPS.filter((step) => {
		const value = account[step.key];
		return value === false || value === undefined;
	});

	if (incompleteSteps.length === 0) return null;

	return (
		<section
			className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800/50 dark:bg-amber-950/30"
			aria-labelledby="completion-steps-heading"
		>
			<h2
				id="completion-steps-heading"
				className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-900 dark:text-amber-100"
			>
				<i className="fa-solid fa-list-check text-amber-600 dark:text-amber-400" aria-hidden />
				{strings("completionSteps.title")}
			</h2>
			<p className="mb-4 text-sm text-amber-800 dark:text-amber-200">
				{strings("completionSteps.description")}
			</p>
			<ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
				{incompleteSteps.map((step, index) => (
					<li key={step.key} className="flex items-center gap-2">
						{index > 0 && (
							<span
								className="hidden text-amber-600 dark:text-amber-400 sm:inline"
								aria-hidden
							>
								›
							</span>
						)}
						<Link
							href={step.href}
							className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-900 shadow-sm transition hover:bg-amber-100 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50 dark:hover:border-amber-600"
						>
							<i
								className={`fa-solid ${step.icon} text-amber-600 dark:text-amber-400`}
								aria-hidden
							/>
							{strings(step.labelKey)}
						</Link>
					</li>
				))}
			</ol>
		</section>
	);
};

export default CompletionStepsWizard;

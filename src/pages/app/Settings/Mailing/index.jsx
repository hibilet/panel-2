import { Link, useLocation } from "wouter";
import { useApp } from "../../../../context";
import strings from "../../../../localization";
import MailingForm from "./MailingForm";

const Mailing = () => {
	const [, setLocation] = useLocation();
	const { refreshAccount } = useApp();

	const handleSaved = () => {
		refreshAccount?.();
		setLocation("/settings");
	};

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<Link
				href="/settings"
				className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.settings")}
			</Link>

			<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
				<h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
					<i
						className="fa-solid fa-envelope text-slate-600 dark:text-slate-400"
						aria-hidden
					/>
					{strings("page.settings.mailingSetup")}
				</h1>
				<MailingForm onSaved={handleSaved} />
			</div>	
		</div>
	);
};

export default Mailing;

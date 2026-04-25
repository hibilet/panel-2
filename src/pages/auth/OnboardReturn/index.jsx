import { useEffect, useMemo } from "react";
import { Link, useSearch } from "wouter";
import { setToken } from "../../../lib/storage";
import strings from "../../../localization";

const OnboardReturn = () => {
	const search = useSearch();
	const { token, missing } = useMemo(() => {
		const params = new URLSearchParams(search);
		const m = params.get("missing");
		return {
			token: params.get("token"),
			missing: m ? m.split(",").map((s) => s.trim()).filter(Boolean) : [],
		};
	}, [search]);

	useEffect(() => {
		if (!token) return;
		if (missing.length === 0) {
			setToken(token);
			return;
		}
		localStorage.setItem("token", token);
		window.history.replaceState({}, "", "/onboard-return");
	}, [token, missing]);

	if (!token) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
				<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
					<i className="fa-solid fa-circle-exclamation text-3xl text-amber-500 mb-3 block" aria-hidden />
					<h1 className="text-xl font-semibold text-slate-900">
						{strings("page.onboardReturn.missingTokenTitle")}
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						{strings("page.onboardReturn.missingTokenDescription")}
					</p>
					<Link href="/" className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900">
						{strings("page.stripeOnboard.backToLogin")}
					</Link>
				</div>
			</div>
		);
	}

	if (missing.length === 0) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center">
				<i className="fa-solid fa-spinner fa-spin mb-4 text-2xl text-slate-500" aria-hidden />
				<p className="text-slate-600">{strings("page.onboardReturn.signingIn")}</p>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
			<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
				<div className="mb-4 text-center">
					<i className="fa-solid fa-clipboard-list text-3xl text-slate-700 mb-3 block" aria-hidden />
					<h1 className="text-xl font-semibold text-slate-900">
						{strings("page.onboardReturn.completeProfileTitle")}
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						{strings("page.onboardReturn.completeProfileDescription")}
					</p>
				</div>
				<ul className="mb-4 space-y-1 text-sm text-slate-700">
					{missing.map((field) => (
						<li key={field} className="flex items-center gap-2">
							<i className="fa-solid fa-circle text-[6px] text-slate-400" aria-hidden />
							<span>{field}</span>
						</li>
					))}
				</ul>
				<a
					href="/settings/billing"
					className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800"
				>
					<i className="fa-solid fa-arrow-right" aria-hidden />
					{strings("page.onboardReturn.openBilling")}
				</a>
			</div>
		</div>
	);
};

export default OnboardReturn;

import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { Select } from "../../../components/inputs";
import Input from "../../../components/inputs/Input";
import { post } from "../../../lib/client";
import strings from "../../../localization";

const COUNTRY_OPTIONS = [
	{ value: "DE", label: "Germany" },
	{ value: "NL", label: "Netherlands" },
	{ value: "TR", label: "Turkey" },
];

const StripeOnboard = () => {
	const search = useSearch();
	const invite = useMemo(() => new URLSearchParams(search).get("invite"), [search]);

	const [email, setEmail] = useState("");
	const [country, setCountry] = useState("DE");
	const [businessType, setBusinessType] = useState("company");
	const [loading, setLoading] = useState(false);
	const [redirecting, setRedirecting] = useState(false);
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const body = { email, country, businessType };
			if (invite) body.invite = invite;
			const res = await post("/auth/stripe/onboard", body);
			const url = res?.data?.url ?? res?.url;
			if (url) {
				setRedirecting(true);
				window.location.href = url;
			} else {
				setError(strings("error.failedStripeOnboard"));
			}
		} catch (err) {
			if (err?.message === "invitation-email-mismatch") {
				setError(strings("error.invitationEmailMismatch"));
			} else {
				setError(err?.message ?? strings("error.failedStripeOnboard"));
			}
		} finally {
			setLoading(false);
		}
	};

	const businessTypeOptions = [
		{ value: "company", label: strings("form.stripeOnboard.businessTypeCompany") },
		{ value: "individual", label: strings("form.stripeOnboard.businessTypeIndividual") },
	];

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
			<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
				<div className="mb-6 flex flex-col items-center text-center">
					<img src="/stripe-logo.webp" alt="Stripe" className="mb-3 h-7 w-auto" />
					<h1 className="text-2xl font-semibold text-slate-900">
						{strings("page.stripeOnboard.title")}
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						{strings("page.stripeOnboard.description")}
					</p>
				</div>

				{invite && !redirecting && (
					<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700" role="status">
						<i className="fa-solid fa-envelope-open-text mr-2" aria-hidden />
						{strings("page.stripeOnboard.invitedBanner")}
					</div>
				)}

				{redirecting ? (
					<div className="flex flex-col items-center gap-3 py-6">
						<i className="fa-solid fa-spinner fa-spin text-3xl text-slate-400" aria-hidden />
						<p className="text-sm text-slate-500">
							{strings("page.stripeOnboard.redirecting")}
						</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
								{error}
							</div>
						)}

						<Input
							label={strings("form.stripeOnboard.email")}
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={strings("form.stripeOnboard.emailPlaceholder")}
							autoComplete="email"
						/>

						<Select
							label={strings("form.stripeOnboard.country")}
							value={country}
							onChange={(e) => setCountry(e.target.value)}
							placeholder={strings("form.stripeOnboard.selectCountry")}
							options={COUNTRY_OPTIONS}
						/>

						<Select
							label={strings("form.stripeOnboard.businessType")}
							value={businessType}
							onChange={(e) => setBusinessType(e.target.value)}
							options={businessTypeOptions}
						/>

						<button
							type="submit"
							disabled={loading || !email || !country || !businessType}
							className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
						>
							{loading ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("common.loading")}
								</>
							) : (
								<>
									<i className="fa-solid fa-arrow-right" aria-hidden />
									{strings("page.stripeOnboard.submit")}
								</>
							)}
						</button>
					</form>
				)}

				<div className="mt-6 text-center">
					<Link
						href="/"
						className="text-sm text-slate-500 hover:text-slate-700"
					>
						{strings("page.stripeOnboard.backToLogin")}
					</Link>
				</div>
			</div>
		</div>
	);
};

export default StripeOnboard;

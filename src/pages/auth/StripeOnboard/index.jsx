import { useState } from "react";
import { Link } from "wouter";
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
	const [email, setEmail] = useState("");
	const [country, setCountry] = useState("DE");
	const [loading, setLoading] = useState(false);
	const [redirecting, setRedirecting] = useState(false);
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await post("/auth/stripe/onboard", { email, country });
			const url = res?.data?.url ?? res?.url;
			if (url) {
				setRedirecting(true);
				window.location.href = url;
			} else {
				setError(strings("error.failedStripeOnboard"));
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedStripeOnboard"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
			<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
				<div className="mb-6 text-center">
					<i className="fa-brands fa-stripe text-4xl text-slate-700 mb-3 block" aria-hidden />
					<h1 className="text-2xl font-semibold text-slate-900">
						{strings("page.stripeOnboard.title")}
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						{strings("page.stripeOnboard.description")}
					</p>
				</div>

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

						<button
							type="submit"
							disabled={loading || !email || !country}
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

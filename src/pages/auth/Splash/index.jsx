import { useState } from "react";
import { useSearch } from "wouter";
import Input from "../../../components/inputs/Input";
import { get, post } from "../../../lib/client";
import { getRealm } from "../../../lib/realm";
import { setToken } from "../../../lib/storage";
import strings from "../../../localization";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const SHOW_STRIPE = false;
// dev:local runs `vite --mode loc`; only then expose the one-click dev login.
const DEV_LOGIN = import.meta.env.MODE === "loc";

const Splash = () => {
	const search = useSearch();
	const params = new URLSearchParams(search);
	const isAdmin = params.get("type") === "admin";
	const authType = isAdmin ? "admin" : "merchant";

	const [step, setStep] = useState("email");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleEmailSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			await post("/auth/request", {
				email,
				type: `account.${authType.toLowerCase()}`,
			});
			setStep("otp");
		} catch (err) {
			setError(err?.message ?? strings("auth.sendFailed"));
		} finally {
			setLoading(false);
		}
	};

	const handleOtpSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await post("/auth/login", {
				email,
				otp,
				type: `account.${authType.toLowerCase()}`,
			});
			const token = res?.data;
			if (token) setToken(token);
			else setError(strings("auth.noToken"));
		} catch (err) {
			setError(err?.message ?? strings("auth.invalidCode"));
		} finally {
			setLoading(false);
		}
	};

	const handleBack = () => {
		setStep("email");
		setOtp("");
		setError(null);
	};

	const handleStripe = () => {
		const realm = getRealm();
		const qs = realm ? `?realm=${encodeURIComponent(realm)}` : "";
		window.location.href = `${API_BASE_URL}/auth/stripe${qs}`;
	};

	const handleDevLogin = async (role) => {
		setError(null);
		setLoading(true);
		try {
			const res = await get(`/auth/dev/login?role=${role}`);
			const token = res?.data?.token;
			if (token) setToken(token);
			else setError(strings("auth.noToken"));
		} catch (err) {
			setError(err?.message ?? strings("auth.devLoginFailed"));
		} finally {
			// On the no-token branch the spinner used to stay forever (both
			// buttons disabled) until reload.
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
			<div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
				<h1 className="mb-6 text-center text-xl font-semibold text-slate-900">
					{strings(isAdmin ? "auth.adminLogin" : "auth.login")}
				</h1>

				{step === "email" ? (
					<>
						<form onSubmit={handleEmailSubmit} className="space-y-4">
							<Input
								label={strings("page.accounts.email")}
								name="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={strings("page.settings.emailPlaceholder")}
								disabled={loading}
								error={error}
								required
							/>
							<button
								type="submit"
								disabled={loading}
								className="w-full rounded-lg bg-slate-800 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
							>
								{loading ? strings("auth.sending") : strings("auth.continue")}
							</button>
						</form>

						{!isAdmin && SHOW_STRIPE && (
							<div className="mt-6 border-t border-slate-200 pt-6">
								<button
									type="button"
									onClick={handleStripe}
									disabled={loading}
									className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
								>
									<span>{strings("auth.continueWith")}</span>
									<img src="/stripe-logo.webp" alt="Stripe" className="h-6 w-auto translate-y-[1px]" />
								</button>
							</div>
						)}
					</>
				) : (
					<form onSubmit={handleOtpSubmit} className="space-y-4">
						<p className="text-sm text-slate-600">
							{strings("auth.codeSentTo")}{" "}
							<strong className="text-slate-900">{email}</strong>
						</p>
						<Input
							label={strings("auth.verificationCode")}
							name="otp"
							type="text"
							inputMode="numeric"
							autoComplete="one-time-code"
							value={otp}
							onChange={(e) =>
								setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
							}
							placeholder={strings("auth.codePlaceholder")}
							disabled={loading}
							error={error}
							required
						/>
						<button
							type="submit"
							disabled={loading || otp.length < 6}
							className="w-full rounded-lg bg-slate-800 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
						>
							{loading ? strings("auth.verifying") : strings("auth.verify")}
						</button>
						<button
							type="button"
							onClick={handleBack}
							disabled={loading}
							className="w-full text-sm text-slate-500 hover:text-slate-700"
						>
							← {strings("auth.differentEmail")}
						</button>
					</form>
				)}

				{DEV_LOGIN && (
					<div className="mt-6 border-t border-dashed border-amber-300 pt-4">
						<p className="mb-2 text-center text-xs font-medium text-amber-600">
							{strings("auth.devLogin")}
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => handleDevLogin("admin")}
								disabled={loading}
								className="flex-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
							>
								{strings("accountType.admin")}
							</button>
							<button
								type="button"
								onClick={() => handleDevLogin("merchant")}
								disabled={loading}
								className="flex-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
							>
								{strings("accountType.merchant")}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Splash;

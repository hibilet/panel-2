import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import CompletionStepsWizard from "../../../components/CompletionStepsWizard";
import { useApp } from "../../../context";
import { put } from "../../../lib/client";
import { uploadImage } from "../../../lib/imgbb";
import { deleteToken, getLang, setLang } from "../../../lib/storage";
import { getStoredTheme, setTheme } from "../../../lib/theme";
import strings, { locales } from "../../../localization";
import LoginQRModal from "./LoginQR";

const LANG_OPTIONS = locales.map((code) => ({
	value: code,
	labelKey: `language.${code}`,
}));

const Settings = () => {
	const { account, refreshAccount } = useApp();
	const [darkMode, setDarkMode] = useState(false);
	const [lang, setLangState] = useState(getLang() || "en");
	const [langDropdownOpen, setLangDropdownOpen] = useState(false);
	const [loginQrOpen, setLoginQrOpen] = useState(false);
	const [logoUploading, setLogoUploading] = useState(false);
	const langDropdownRef = useRef(null);
	const logoInputRef = useRef(null);

	useEffect(() => {
		const stored = getStoredTheme();
		setDarkMode(
			stored === "dark" ||
				(!stored && window.matchMedia("(prefers-color-scheme: dark)").matches),
		);
	}, []);

	useEffect(() => {
		setLangState(getLang() || "en");
	}, []);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (
				langDropdownRef.current &&
				!langDropdownRef.current.contains(e.target)
			) {
				setLangDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleDarkModeChange = (e) => {
		const checked = e.target.checked;
		setDarkMode(checked);
		setTheme(checked ? "dark" : "light");
	};

	const handleLangSelect = (newLang) => {
		if (newLang && newLang !== lang) {
			setLang(newLang);
		}
		setLangDropdownOpen(false);
	};

	const handleLogout = () => {
		deleteToken();
	};

	const handleLogoUpload = async (e) => {
		const file = e.target.files?.[0];
		if (!file || !file.type.startsWith("image/")) return;
		setLogoUploading(true);
		try {
			const url = await uploadImage(file);
			await put("/accounts/me", { logo: url });
			await refreshAccount?.();
		} catch {
			// Error is shown via withToast in put
		} finally {
			setLogoUploading(false);
			if (logoInputRef.current) logoInputRef.current.value = "";
		}
	};

	const handleLogoRemove = async () => {
		setLogoUploading(true);
		try {
			await put("/accounts/me", { logo: "" });
			await refreshAccount?.();
		} catch {
			// Error is shown via withToast in put
		} finally {
			setLogoUploading(false);
		}
	};

	return (
		<div className="mx-auto max-w-5xl space-y-8">
			<CompletionStepsWizard />

			{/* Account details */}
			<h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
				<i className="fa-solid fa-user" aria-hidden />
				{strings("page.settings.accountDetails")}
			</h2>
			{account && (
				<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-fade-in dark:border-slate-700 dark:bg-slate-800">
					<dl className="grid gap-3 sm:grid-cols-2">
						<div>
							<dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
								{strings("page.settings.name")}
							</dt>
							<dd className="mt-0.5 text-slate-900 dark:text-white">
								{account.name}
							</dd>
						</div>
						<div>
							<dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
								{strings("page.settings.email")}
							</dt>
							<dd className="mt-0.5 text-slate-900 dark:text-white">
								{account.email}
							</dd>
						</div>
						{account.phone && (
							<div>
								<dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
									{strings("page.settings.phone")}
								</dt>
								<dd className="mt-0.5 text-slate-900 dark:text-white">
									{account.phone}
								</dd>
							</div>
						)}
						<div>
							<dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
								{strings("common.status")}
							</dt>
							<dd className="mt-0.5 text-slate-900 dark:text-white">
								{account.status}
							</dd>
						</div>
					</dl>

					{/* Account logo upload — only for merchants */}
					{account.type === "account.merchant" && (
					<div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
						<p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
							{strings("page.settings.clickImageToUploadLogo")}
						</p>
						<div className="flex flex-col gap-2">
							<input
								ref={logoInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleLogoUpload}
							/>
							<button
								type="button"
								onClick={() => logoInputRef.current?.click()}
								disabled={logoUploading}
								className="relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-[#111827] outline-none transition-opacity hover:opacity-90 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 dark:border-slate-600"
							>
								<div className="aspect-[6/1] max-h-32 w-full p-4">
									{account.logo ? (
										<img
											src={account.logo}
											alt=""
											className="h-full w-full object-contain"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center">
											<i
												className="fa-solid fa-image text-4xl text-slate-400"
												aria-hidden
											/>
										</div>
									)}
								</div>
								{logoUploading && (
									<div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
										<i
											className="fa-solid fa-spinner fa-spin text-2xl text-white"
											aria-hidden
										/>
									</div>
								)}
							</button>
							{account.logo && (
								<button
									type="button"
									onClick={handleLogoRemove}
									disabled={logoUploading}
									className="inline-flex w-fit items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
								>
									<i className="fa-solid fa-trash-can" aria-hidden />
									{strings("page.settings.removeLogo")}
								</button>
							)}
						</div>
					</div>
					)}
				</section>
			)}

			{/* Settings cards grid */}
			<section>
				<h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
					<i className="fa-solid fa-gear" aria-hidden />
					{strings("page.settings.preferences")}
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<Link
						href="/settings/mailing"
						className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:border-slate-600"
					>
						<i
							className="fa-solid fa-envelope text-xl text-slate-600 dark:text-slate-400"
							aria-hidden
						/>
						<span className="font-medium text-slate-900 dark:text-white">
							{strings("page.settings.mailingSetup")}
						</span>
					</Link>

					<Link
						href="/settings/providers"
						className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:border-slate-600"
					>
						<i
							className="fa-solid fa-credit-card text-xl text-slate-600 dark:text-slate-400"
							aria-hidden
						/>
						<span className="font-medium text-slate-900 dark:text-white">
							{strings("page.settings.saleProviders")}
						</span>
					</Link>

					<Link
						href="/settings/agreements"
						className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:border-slate-600"
					>
						<i
							className="fa-solid fa-file-contract text-xl text-slate-600 dark:text-slate-400"
							aria-hidden
						/>
						<span className="font-medium text-slate-900 dark:text-white">
							{strings("page.settings.salesAgreements")}
						</span>
					</Link>

					{/* Theme switch card */}
					<div
						style={{display: "none"}}
						className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
						<i
							className={`fa-solid ${darkMode ? "fa-moon" : "fa-sun"} text-xl text-slate-600 dark:text-slate-400`}
							aria-hidden
						/>
						<div className="flex-1">
							<span className="font-medium text-slate-900 dark:text-white">
								{darkMode
									? strings("page.settings.darkMode")
									: strings("page.settings.lightTheme")}
							</span>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={darkMode}
							onClick={() =>
								handleDarkModeChange({ target: { checked: !darkMode } })
							}
							className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:bg-slate-600"
						>
							<span
								className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
									darkMode ? "translate-x-5" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					{/* Language dropdown card */}
					<div className="relative" ref={langDropdownRef}>
						<button
							type="button"
							onClick={() => setLangDropdownOpen((o) => !o)}
							className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:border-slate-600"
						>
							<i
								className="fa-solid fa-globe text-xl text-slate-600 dark:text-slate-400"
								aria-hidden
							/>
							<span className="flex-1 font-medium text-slate-900 dark:text-white">
								{strings("page.settings.language")}
							</span>
							<span className="text-sm text-slate-500 dark:text-slate-400">
								{strings(`language.${lang}`)}
							</span>
							<i
								className={`fa-solid fa-chevron-down text-slate-500 transition-transform ${langDropdownOpen ? "rotate-180" : ""}`}
								aria-hidden
							/>
						</button>
						{langDropdownOpen && (
							<div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
								{LANG_OPTIONS.map((opt) => (
									<button
										key={opt.value}
										type="button"
										onClick={() => handleLangSelect(opt.value)}
										className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
											lang === opt.value
												? "font-medium text-slate-900 dark:text-white"
												: "text-slate-600 dark:text-slate-300"
										}`}
									>
										{strings(opt.labelKey)}
									</button>
								))}
							</div>
						)}
					</div>

					<button
						type="button"
						onClick={() => setLoginQrOpen(true)}
						className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:border-slate-600"
					>
						<i
							className="fa-solid fa-qrcode text-xl text-slate-600 dark:text-slate-400"
							aria-hidden
						/>
						<span className="font-medium text-slate-900 dark:text-white">
							{strings("page.settings.showLoginQr")}
						</span>
					</button>

					<button
						type="button"
						onClick={handleLogout}
						className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-left shadow-sm transition-colors hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/50"
					>
						<i
							className="fa-solid fa-right-from-bracket text-xl text-red-600 dark:text-red-400"
							aria-hidden
						/>
						<span className="font-medium text-red-700 dark:text-red-400">
							{strings("page.settings.logout")}
						</span>
					</button>
				</div>
			</section>

			<LoginQRModal
				isOpen={loginQrOpen}
				onClose={() => setLoginQrOpen(false)}
			/>
		</div>
	);
};

export default Settings;

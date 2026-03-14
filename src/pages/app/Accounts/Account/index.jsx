import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

import { get, put, post } from "../../../../lib/client";
import { Input, Select } from "../../../../components/inputs";
import strings from "../../../../localization";
import { getToken, setToken, setHotSwapToken } from "../../../../lib/storage";

const STATUS_OPTIONS = [
	{ value: "active", label: strings("common.active") },
	{ value: "inactive", label: strings("common.inactive") },
];

const defaultValues = {
	name: "",
	email: "",
	phone: "",
	status: "active",
};

const AccountPanel = ({ id, onClose }) => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [loginAsLoading, setLoginAsLoading] = useState(false);
	const [error, setError] = useState(null);

	const { register, handleSubmit, reset } = useForm({ defaultValues });

	useEffect(() => {
		setLoading(true);
		setError(null);
		get(`/accounts/${id}`)
			.then((res) => {
				const d = res.data ?? null;
				setData(d);
				if (d) {
					reset({
						name: d.name ?? "",
						email: d.email ?? "",
						phone: d.phone ?? "",
						status: d.status ?? "active",
					});
				}
			})
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadAccounts")),
			)
			.finally(() => setLoading(false));
	}, [id, reset]);

	const onSave = async (formData) => {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				name: formData.name?.trim() || undefined,
				email: formData.email?.trim() || undefined,
				phone: formData.phone?.trim() || undefined,
				status: formData.status || undefined,
			};
			const res = await put(`/accounts/${id}`, payload);
			setData((prev) =>
				prev ? { ...prev, ...(res.data ?? payload) } : (res.data ?? payload),
			);
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	const handleLoginAs = async () => {
		if (!data?.type) {
			setError(strings("form.account.errorLoginAs"));
			return;
		}
		setLoginAsLoading(true);
		setError(null);
		try {
			const res = await post("/auth/token", { id, type: data.type });
			const token = res?.data?.token ?? res?.token;
			if (token) {
				const currentToken = getToken();
				if (currentToken) setHotSwapToken(currentToken);
				setToken(token);
			} else {
				setError(strings("form.account.errorLoginAs"));
			}
		} catch (err) {
			setError(err?.message ?? strings("form.account.errorLoginAs"));
		} finally {
			setLoginAsLoading(false);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h2 className="text-lg font-semibold text-slate-900">
					{strings("page.accounts.details")}
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-xl" aria-hidden />
				</button>
			</header>

			<div className="flex-1 overflow-y-auto p-6">
				{loading ? (
					<div className="flex flex-col gap-4">
						<div className="h-10 w-48 animate-pulse rounded bg-slate-200" />
						<div className="h-64 animate-pulse rounded-lg bg-slate-100" />
					</div>
				) : error && !data ? (
					<div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
						{error}
					</div>
				) : (
					<form
						id="account-form"
						onSubmit={handleSubmit(onSave)}
						className="space-y-4"
					>
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
								{error}
							</div>
						)}
						<Input
							label={strings("common.name")}
							{...register("name")}
							placeholder={strings("page.settings.yourName")}
						/>
						<Input
							label={strings("page.accounts.email")}
							type="email"
							{...register("email")}
							placeholder={strings("page.settings.emailPlaceholder")}
						/>
						<Input
							label={strings("page.settings.phone")}
							{...register("phone")}
							placeholder="+90 555 555 5555"
						/>
						<Select
							label={strings("common.status")}
							{...register("status")}
							options={STATUS_OPTIONS}
						/>
					</form>
				)}
			</div>

			{!loading && data && (
				<footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
					<button
						type="button"
						onClick={handleLoginAs}
						disabled={loginAsLoading}
						className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
					>
						{loginAsLoading ? (
							<i className="fa-solid fa-spinner fa-spin" aria-hidden />
						) : (
							<i className="fa-solid fa-right-to-bracket" aria-hidden />
						)}
						{strings("form.account.loginAs")}
					</button>
					<button
						type="submit"
						form="account-form"
						disabled={saving}
						className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
					>
						{saving ? (
							<i className="fa-solid fa-spinner fa-spin" aria-hidden />
						) : (
							<i className="fa-solid fa-check" aria-hidden />
						)}
						{strings("common.save")}
					</button>
				</footer>
			)}
		</div>
	);
};

export default AccountPanel;

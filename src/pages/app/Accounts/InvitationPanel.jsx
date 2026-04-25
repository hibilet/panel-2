import { useEffect, useState } from "react";
import { Select } from "../../../components/inputs";
import Input from "../../../components/inputs/Input";
import { get, post } from "../../../lib/client";
import strings from "../../../localization";

const InvitationPanel = ({ onClose, onCreated }) => {
	const [email, setEmail] = useState("");
	const [realmId, setRealmId] = useState("");
	const [ttlDays, setTtlDays] = useState(7);
	const [realms, setRealms] = useState([]);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [error, setError] = useState(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		get("/realms")
			.then((res) => setRealms(res.data ?? []))
			.catch(() => setRealms([]));
	}, []);

	const submit = async (e) => {
		e.preventDefault();
		setError(null);
		setResult(null);
		setLoading(true);
		try {
			const body = { email, ttlDays: Number(ttlDays) };
			if (realmId) body.realmId = realmId;
			const res = await post("/admin/invitations", body);
			const data = res?.data ?? res;
			setResult(data);
			onCreated?.(data);
		} catch (err) {
			setError(err?.message ?? strings("error.failedCreateInvitation"));
		} finally {
			setLoading(false);
		}
	};

	const copy = async () => {
		if (!result?.url) return;
		try {
			await navigator.clipboard.writeText(result.url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			/* clipboard API unavailable */
		}
	};

	const realmOptions = [
		{ value: "", label: strings("form.invitation.realmDefault") },
		...realms.map((r) => ({ value: r.id ?? r._id, label: r.name })),
	];

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h2 className="text-lg font-semibold text-slate-900">
					{strings("page.invitations.title")}
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-lg" aria-hidden />
				</button>
			</header>

			<form
				onSubmit={submit}
				className="flex flex-1 flex-col overflow-hidden"
			>
				<div className="flex-1 overflow-y-auto px-6 py-5">
					<div className="space-y-4">
						<p className="text-sm text-slate-500">
							{strings("page.invitations.description")}
						</p>

						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
								{error}
							</div>
						)}

						<Input
							label={strings("form.invitation.email")}
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={strings("form.invitation.emailPlaceholder")}
						/>

						<Select
							label={strings("form.invitation.realm")}
							value={realmId}
							onChange={(e) => setRealmId(e.target.value)}
							options={realmOptions}
						/>

						<Input
							label={strings("form.invitation.ttlDays")}
							type="number"
							min={1}
							max={30}
							value={ttlDays}
							onChange={(e) => setTtlDays(e.target.value)}
						/>

						{result && (
							<div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
								<div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
									<i className="fa-solid fa-circle-check" aria-hidden />
									{strings("page.invitations.success")}
								</div>
								{result.expiresAt && (
									<p className="text-xs text-emerald-700">
										{strings("page.invitations.expires")}:{" "}
										{new Date(result.expiresAt).toLocaleString()}
									</p>
								)}
								{result.url && (
									<div className="flex items-stretch gap-2">
										<input
											readOnly
											value={result.url}
											className="flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 font-mono text-xs text-slate-700"
										/>
										<button
											type="button"
											onClick={copy}
											className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
										>
											<i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} aria-hidden />
											{copied ? strings("common.copied") : strings("common.copy")}
										</button>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				<footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
					>
						{strings("common.cancel")}
					</button>
					<button
						type="submit"
						disabled={loading || !email}
						className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
					>
						{loading ? (
							<>
								<i className="fa-solid fa-spinner fa-spin" aria-hidden />
								{strings("common.loading")}
							</>
						) : (
							<>
								<i className="fa-solid fa-paper-plane" aria-hidden />
								{strings("form.invitation.submit")}
							</>
						)}
					</button>
				</footer>
			</form>
		</div>
	);
};

export default InvitationPanel;

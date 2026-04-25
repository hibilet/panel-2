import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { Input } from "../../../../components/inputs";
import { get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";

const MailingForm = ({ onSaved }) => {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const [mailing, setMailing] = useState(null);
	const [mode, setMode] = useState(null);

	const { register, handleSubmit, reset } = useForm({
		defaultValues: {
			sender: "",
			email: "",
			password: "",
			server: "",
			port: "",
		},
	});

	useEffect(() => {
		setError(null);
		get("/mailing")
			.then((res) => {
				const items = res.data ?? [];
				const first = items[0];
				if (first) {
					setMailing(first);
					setMode(first.default ? "default" : "custom");
					reset({
						sender: first.sender ?? "",
						email: first.email ?? "",
						password: first.password ?? "",
						server: first.server ?? "",
						port: first.port?.toString() ?? "",
					});
				}
			})
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadMailing")),
			)
			.finally(() => setLoading(false));
	}, [reset]);

	const persist = async (payload) => {
		if (mailing?.id) {
			await put(`/mailing/${mailing.id}`, payload);
			setMailing((prev) => (prev ? { ...prev, ...payload } : null));
		} else {
			const res = await post("/mailing", payload);
			setMailing(res.data ?? { ...payload });
		}
	};

	const onSaveCustom = async (data) => {
		setSaving(true);
		setError(null);
		try {
			await persist({
				default: false,
				sender: data.sender,
				email: data.email,
				password: data.password || undefined,
				server: data.server,
				port: data.port ? parseInt(data.port, 10) : undefined,
			});
			onSaved?.();
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	const onSaveDefault = async () => {
		setSaving(true);
		setError(null);
		try {
			await persist({ default: true });
			onSaved?.();
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center py-12">
				<i
					className="fa-solid fa-spinner fa-spin text-3xl text-slate-400"
					aria-hidden
				/>
			</div>
		);
	}

	const ModeCard = ({ value, icon, title, description }) => {
		const selected = mode === value;
		return (
			<button
				type="button"
				onClick={() => setMode(value)}
				className={`flex flex-1 flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
					selected
						? "border-slate-900 bg-slate-50 ring-2 ring-slate-900"
						: "border-slate-200 bg-white hover:border-slate-300"
				}`}
			>
				<i className={`fa-solid ${icon} text-lg text-slate-700`} aria-hidden />
				<div className="text-sm font-semibold text-slate-900">{title}</div>
				<div className="text-xs text-slate-500">{description}</div>
			</button>
		);
	};

	return (
		<div className="space-y-6">
			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
					{error}
				</div>
			)}

			<div className="flex flex-col gap-3 sm:flex-row">
				<ModeCard
					value="default"
					icon="fa-paper-plane"
					title={strings("form.mailing.modeDefault")}
					description={strings("form.mailing.modeDefaultDesc")}
				/>
				<ModeCard
					value="custom"
					icon="fa-server"
					title={strings("form.mailing.modeCustom")}
					description={strings("form.mailing.modeCustomDesc")}
				/>
			</div>

			{mode === "default" && (
				<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
					{strings("form.mailing.defaultBody")}
					<div className="pt-4 flex gap-2">
						<button
							type="button"
							onClick={onSaveDefault}
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("common.saving")}
								</>
							) : (
								<>
									<i className="fa-solid fa-check" aria-hidden />
									{strings("form.mailing.useDefault")}
								</>
							)}
						</button>
						<Link href="/settings/mailing/template">
							<button
								type="button"
								disabled={saving}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<i className="fa-solid fa-envelope" aria-hidden />
								{strings("common.editTemplate")}
							</button>
						</Link>
					</div>
				</div>
			)}

			{mode === "custom" && (
				<form onSubmit={handleSubmit(onSaveCustom)} className="space-y-6">
					<div className="grid grid-cols-1 gap-4">
						<Input
							label={strings("form.mailing.sender")}
							{...register("sender")}
							placeholder={strings("form.mailing.senderPlaceholder")}
							autoComplete="name"
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Input
							label={strings("form.mailing.email")}
							type="email"
							{...register("email")}
							placeholder={strings("form.mailing.emailPlaceholder")}
							autoComplete="email"
						/>
						<Input
							label={strings("form.mailing.password")}
							type="password"
							{...register("password")}
							placeholder={strings("form.mailing.passwordPlaceholder")}
							autoComplete="password"
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Input
							label={strings("form.mailing.server")}
							{...register("server")}
							placeholder={strings("form.mailing.serverPlaceholder")}
							autoComplete="off"
						/>
						<Input
							label={strings("form.mailing.port")}
							type="number"
							{...register("port")}
							placeholder={strings("form.mailing.portPlaceholder")}
						/>
					</div>

					<div className="pt-4 flex gap-2">
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("common.saving")}
								</>
							) : (
								<>
									<i className="fa-solid fa-floppy-disk" aria-hidden />
									{strings("common.save")}
								</>
							)}
						</button>
						<Link href="/settings/mailing/template">
							<button
								type="button"
								disabled={saving}
								className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<i className="fa-solid fa-envelope" aria-hidden />
								{strings("common.editTemplate")}
							</button>
						</Link>
					</div>
				</form>
			)}
		</div>
	);
};

export default MailingForm;

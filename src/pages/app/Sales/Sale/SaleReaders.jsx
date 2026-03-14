import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";

import { get, post, put, del } from "../../../../lib/client";
import { Input, Select } from "../../../../components/inputs";
import { EmptyState, SlidePanel } from "../../../../components/shared";
import DataTable from "../../../../components/tables/DataTable";
import { readerColumns } from "../../../../components/tables/columns";
import strings from "../../../../localization";

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";
const STATUS_OPTIONS = [
	{ value: "active", label: `✅ ${strings("common.active")}` },
	{ value: "inactive", label: `⛔ ${strings("common.inactive")}` },
];

const getInitialForm = (reader) => {
	if (reader) {
		return {
			name: reader.name ?? "",
			email: reader.email ?? "",
			status: reader.status ?? "active",
		};
	}
	return {
		name: "",
		email: "",
		status: "active",
	};
};

const SaleReaders = () => {
	const { id } = useParams();
	const isNew = id === "new";

	const [readers, setReaders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [panelReader, setPanelReader] = useState(null);
	const [saving, setSaving] = useState(null);
	const [deleting, setDeleting] = useState(null);
	const [linkDialog, setLinkDialog] = useState(null);

	const panelOpen = panelReader !== null;
	const isAdding = panelReader === "new";

	const fetchReaders = useCallback(() => {
		if (isNew) return;
		setLoading(true);
		setError(null);
		get(`/accounts/search?sale=${id}&type=account.reader`)
			.then((r) => setReaders(r.data ?? []))
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadReaders")),
			)
			.finally(() => setLoading(false));
	}, [id, isNew]);

	useEffect(() => {
		if (isNew) {
			setLoading(false);
			setReaders([]);
			return;
		}
		fetchReaders();
	}, [fetchReaders, isNew]);

	const closePanel = useCallback(() => setPanelReader(null), []);

	const handleSave = async (reader, payload) => {
		setSaving(reader?.id ?? reader?._id ?? "new");
		setError(null);
		try {
			const readerId = reader?.id ?? reader?._id;
			if (readerId) {
				await put(`/accounts/${readerId}`, {
					...payload,
					type: "account.reader",
				});
				await fetchReaders();
				closePanel();
			} else {
				await post("/accounts", {
					...payload,
					sale: id,
					type: "account.reader",
				});
				await fetchReaders();
				closePanel();
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(null);
		}
	};

	const handleDelete = async (readerId) => {
		if (!confirm(strings("form.reader.confirmDelete"))) return;
		setDeleting(readerId);
		setError(null);
		try {
			await del(`/accounts/${readerId}`);
			await fetchReaders();
			closePanel();
		} catch (err) {
			setError(err?.message ?? strings("error.failedDelete"));
		} finally {
			setDeleting(null);
		}
	};

	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === "Escape" && panelOpen) closePanel();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [panelOpen, closePanel]);

	if (loading && readers.length === 0 && !isNew) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
				<div className="h-64 animate-pulse rounded-lg bg-slate-100" />
			</div>
		);
	}

	if (isNew) {
		return (
			<div className="mx-auto max-w-5xl">
				<h1 className="text-2xl font-semibold text-slate-900">
					🤳🏻 {strings("form.reader.title")}
				</h1>
				<EmptyState
					icon="fa-tablet-screen-button"
					variant="amber"
					title={strings("form.reader.saveFirst")}
					description={strings("form.reader.saveFirstDesc")}
					className="mt-6"
				/>
			</div>
		);
	}

	return (
		<div className="relative">
			<div className="space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-lg font-medium text-slate-900">
							{strings("form.reader.title")}
						</h2>
						<p className="mt-0.5 text-sm text-slate-500">
							{readers.length === 1
								? strings("form.reader.count", [readers.length])
								: strings("form.reader.countPlural", [readers.length])}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setPanelReader("new")}
						className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
					>
						<i className="fa-solid fa-plus" aria-hidden />
						{strings("form.reader.addReader")}
					</button>
				</div>

				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
						{error}
					</div>
				)}

				{readers.length === 0 ? (
					<EmptyState
						icon="fa-tablet-screen-button"
						title={strings("form.reader.noReaders")}
						description={strings("form.reader.noReadersDesc")}
						action={
							<button
								type="button"
								onClick={() => setPanelReader("new")}
								className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
							>
								<i className="fa-solid fa-plus" aria-hidden />
								{strings("form.reader.addReader")}
							</button>
						}
					/>
				) : (
					<DataTable
						data={readers}
						columns={readerColumns((r) => setLinkDialog(r))}
						getRowKey={(r) => r.id ?? r._id}
						onRowClick={setPanelReader}
					/>
				)}
			</div>

			<SlidePanel
				isOpen={panelOpen}
				onClose={closePanel}
				aria-label={
					isAdding
						? strings("form.reader.addReader")
						: strings("form.reader.editReader")
				}
			>
				<ReaderPanel
					key={
						isAdding ? "new" : (panelReader?.id ?? panelReader?._id ?? "edit")
					}
					reader={isAdding ? null : panelReader}
					onSave={handleSave}
					onDelete={handleDelete}
					onClose={closePanel}
					onGetLink={() => setLinkDialog(isAdding ? null : panelReader)}
					saving={saving}
					deleting={deleting}
				/>
			</SlidePanel>

			{linkDialog && (
				<ReaderLinkDialog
					reader={linkDialog}
					onClose={() => setLinkDialog(null)}
				/>
			)}
		</div>
	);
};

const ReaderPanel = ({
	reader,
	onSave,
	onDelete,
	onClose,
	onGetLink,
	saving,
	deleting,
}) => {
	const isNew = reader === null;
	const defaultValues = getInitialForm(reader);
	const { register, handleSubmit, reset } = useForm({ defaultValues });

	useEffect(() => {
		reset(getInitialForm(reader));
	}, [reader, reset]);

	const onFormSubmit = (formData) => {
		const payload = {
			name: formData.name?.trim() || undefined,
			email: formData.email?.trim() || undefined,
			status: formData.status || "active",
		};
		onSave(reader, payload);
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h3 className="text-lg font-semibold text-slate-900">
					{isNew
						? strings("form.reader.newReader")
						: reader?.name || strings("form.reader.editReader")}
				</h3>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-lg" aria-hidden />
				</button>
			</header>

			<form
				onSubmit={handleSubmit(onFormSubmit)}
				className="flex flex-1 flex-col overflow-hidden"
			>
				<div className="flex-1 overflow-y-auto px-6 py-5">
					<div className="space-y-5">
						<div className="space-y-4">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
								{strings("common.details")}
							</h4>
							<Input
								label={strings("common.name")}
								{...register("name")}
								placeholder={strings("form.reader.namePlaceholder")}
							/>
							<Input
								label={strings("form.transaction.email")}
								type="email"
								{...register("email")}
								placeholder={strings("form.reader.emailPlaceholder")}
							/>
							<Select
								label={strings("common.status")}
								{...register("status")}
								options={STATUS_OPTIONS}
							/>
						</div>

						{!isNew && reader && onGetLink && (
							<div className="space-y-4">
								<h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
									{strings("form.reader.readerLink")}
								</h4>
								<button
									type="button"
									onClick={onGetLink}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
								>
									🔗 {strings("form.reader.getQrLink")}
								</button>
							</div>
						)}
					</div>
				</div>

				<footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
					<div className="flex flex-wrap gap-3">
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
						>
							{saving ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("common.saving")}
								</>
							) : (
								<>
									{isNew
										? strings("form.reader.createReader")
										: strings("form.ticket.saveChanges")}
								</>
							)}
						</button>
						{isNew ? (
							<button
								type="button"
								onClick={onClose}
								className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								{strings("common.cancel")}
							</button>
						) : (
							<button
								type="button"
								onClick={() => onDelete(reader?.id ?? reader?._id)}
								disabled={deleting}
								className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{deleting ? (
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
								) : (
									strings("common.delete")
								)}
							</button>
						)}
					</div>
				</footer>
			</form>
		</div>
	);
};

const ReaderLinkDialog = ({ reader, onClose }) => {
	const [token, setToken] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	useEffect(() => {
		const payload = {
			name: reader.name,
			email: reader.email,
			type: "account.reader",
			id: reader.id ?? reader._id,
		};
		post("/auth/token", payload)
			.then((r) => setToken(r.data?.token ?? null))
			.catch((err) =>
				setError(err?.message ?? strings("form.reader.errorToken")),
			)
			.finally(() => setLoading(false));
	}, [reader]);

	const handleCopyLink = async () => {
		if (!token) return;
		try {
			await navigator.clipboard.writeText(token);
		} catch {
			setError(strings("form.reader.errorCopy"));
		}
	};

	const qrUrl = token
		? `${QR_API}?size=200x200&data=${encodeURIComponent(token)}`
		: null;

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="reader-link-dialog-title"
		>
			<div
				className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
				aria-hidden
				onClick={onClose}
			/>
			<article className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
				<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h2
						id="reader-link-dialog-title"
						className="text-lg font-semibold text-slate-900"
					>
						{reader.name ?? strings("form.reader.reader")}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
						aria-label={strings("common.ariaClose")}
					>
						<i className="fa-solid fa-xmark text-lg" aria-hidden />
					</button>
				</header>
				<section className="p-4">
					<div className="flex flex-col items-center gap-4">
						{loading && (
							<div className="flex h-48 items-center justify-center">
								<i
									className="fa-solid fa-spinner fa-spin text-3xl text-slate-400"
									aria-hidden
								/>
							</div>
						)}
						{error && <p className="text-sm text-red-600">{error}</p>}
						{!loading && !error && (
							<>
								<p className="m-0 text-sm text-slate-600">
									{strings("form.reader.readQrCode")}
								</p>
								{qrUrl && (
									<img
										alt={strings("form.reader.qrCodeAlt")}
										src={qrUrl}
										className="my-8 w-[35%] min-w-[140px] invert"
										style={{ imageRendering: "pixelated" }}
									/>
								)}
								<button
									type="button"
									onClick={handleCopyLink}
									disabled={!token}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
								>
									📋 {strings("form.reader.copyLink")}
								</button>
							</>
						)}
					</div>
				</section>
			</article>
		</div>
	);
};

export default SaleReaders;

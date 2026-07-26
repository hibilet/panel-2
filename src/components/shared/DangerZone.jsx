import { useState } from "react";
import { Modal } from "./index";
import strings from "../../localization";

// A reusable delete affordance for a detail page. The delete is a SOFT delete
// server-side (deletedAt) and is audit-logged by the API; this only gates the
// UI and confirms intent. `onDelete` should return a promise.
const DangerZone = ({
	title,
	description,
	confirmTitle,
	confirmBody,
	onDelete,
	disabled = false,
}) => {
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	const doDelete = async () => {
		setBusy(true);
		setError(null);
		try {
			await onDelete();
			setOpen(false);
		} catch (err) {
			setError(err?.message ?? strings("common.errorOccurred"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="mt-8 rounded-lg border border-red-200 bg-red-50/40 p-4">
			<div className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-700">
				<i className="fa-solid fa-triangle-exclamation" aria-hidden />
				{title ?? strings("common.dangerZone", "Danger zone")}
			</div>
			{description && (
				<p className="mb-3 text-xs text-red-700/80">{description}</p>
			)}
			<button
				type="button"
				onClick={() => setOpen(true)}
				disabled={disabled}
				className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
			>
				<i className="fa-solid fa-trash" aria-hidden />
				{strings("common.delete")}
			</button>

			<Modal
				isOpen={open}
				onClose={() => !busy && setOpen(false)}
				title={confirmTitle ?? strings("common.confirmDelete", "Confirm delete")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setOpen(false)}
							disabled={busy}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={doDelete}
							disabled={busy}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
						>
							{busy ? (
								<i className="fa-solid fa-spinner fa-spin" aria-hidden />
							) : (
								<i className="fa-solid fa-trash" aria-hidden />
							)}
							{strings("common.delete")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{confirmBody ?? strings("common.confirmDeleteBody", "This cannot be undone from here.")}
				</p>
				{error && <p className="mt-2 text-xs text-red-600">{error}</p>}
			</Modal>
		</div>
	);
};

export default DangerZone;

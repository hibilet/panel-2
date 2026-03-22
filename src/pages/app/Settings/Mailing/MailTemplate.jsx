import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import ejs from "ejs";
import { Link } from "wouter";
import { get, put } from "../../../../lib/client";
import strings from "../../../../localization";

import defaultMailTemplate from "../../../../templates/default-mail.html?raw";

const DEFAULT_TEMPLATE = defaultMailTemplate;

/** Dummy data for EJS preview — matches default-mail template structure */
const getPreviewData = () => {
	const saleStart = new Date("2025-03-15T19:00:00+01:00");
	const saleEnd = new Date("2025-03-15T23:00:00+01:00");
	return {
		dayjs,
		basket: {
			owner: { name: "Max Mustermann" },
		},
		channel: { _id: "ch_sample123" },
		sale: {
			_id: "sale_abc456",
			name: "Rock & Pop Konzert",
			start: saleStart,
			end: saleEnd,
		},
		venue: { name: "Konzerthaus Berlin", city: "Mitte" },
		reservations: [
			{
				product: { name: "Standard", price: 29 },
				seat: { name: "A-12" },
				parentReservation: null,
				coupon: null,
			},
			{
				product: { name: "Standard", price: 29 },
				seat: { name: "A-13" },
				parentReservation: null,
				coupon: null,
			},
			{
				product: { name: "VIP", price: 79 },
				seat: { name: "VIP-1" },
				parentReservation: null,
				coupon: { discount: 0.2 },
			},
		],
		transaction: { _id: "txn_xyz789" },
		base64: "cmVmX2RlbW9fMTIzNDU2Nzg5MA==",
		billing: {
			email: "support@example.com",
			corporate: { name: "Veranstalter GmbH" },
		},
	};
};

const MailTemplate = () => {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const [html, setHtml] = useState(DEFAULT_TEMPLATE);

	useEffect(() => {
		setError(null);
		get("/mailing/template")
			.then((res) => {
				const content = res.data?.html ?? res.data ?? "";
				if (content) setHtml(content);
			})
			.catch(() => {
				// No template endpoint or not configured — use default
			})
			.finally(() => setLoading(false));
	}, []);

	const handleSave = async () => {
		setSaving(true);
		setError(null);
		try {
			await put("/mailing/template", { html });
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	const { rendered, error: renderError } = useMemo(() => {
		try {
			const result = ejs.render(html, getPreviewData(), {
				escape: (s) => String(s ?? ""),
			});
			return { rendered: result, error: null };
		} catch (err) {
			return {
				rendered: null,
				error: err?.message ?? "EJS render failed",
			};
		}
	}, [html]);

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

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<Link
					href="/settings/mailing"
					className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
				>
					<i className="fa-solid fa-arrow-left" aria-hidden />
					{strings("back.mailing")}
				</Link>
				<button
					type="button"
					onClick={handleSave}
					disabled={saving}
					className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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
			</div>

			<div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
				<h1 className="border-b border-slate-200 bg-slate-50 px-6 py-4 text-lg font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white">
					<i className="fa-solid fa-code mr-2 text-slate-600 dark:text-slate-400" aria-hidden />
					{strings("page.settings.mailTemplate")}
				</h1>

				{error && (
					<div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
						{error}
					</div>
				)}

				{renderError && (
					<div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
						{strings("form.mailing.templateRenderError")}: {renderError}
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-[60vh]">
					{/* Left: 1 part — raw EJS template */}
					<div className="lg:col-span-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
						<div className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
							{strings("form.mailing.templateEjs")}
						</div>
						<textarea
							value={html}
							onChange={(e) => setHtml(e.target.value)}
							className="flex-1 resize-none border-0 bg-slate-50 p-4 font-mono text-sm text-slate-800 focus:outline-none focus:ring-0 dark:bg-slate-900/50 dark:text-slate-200"
							spellCheck={false}
							placeholder="<%= variable %>..."
						/>
					</div>

					{/* Right: 2 parts — preview */}
					<div className="lg:col-span-2 flex flex-col">
						<div className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
							{strings("form.mailing.templatePreview")}
						</div>
						<div className="flex-1 min-h-[200px] bg-white dark:bg-slate-900">
							{rendered ? (
								<iframe
									srcDoc={rendered}
									title={strings("form.mailing.templatePreview")}
									sandbox="allow-same-origin"
									className="w-full h-full min-h-[300px] border-0"
								/>
							) : (
								<div className="flex h-full min-h-[300px] items-center justify-center p-6 text-slate-500 dark:text-slate-400">
									{strings("form.mailing.templatePreviewError")}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default MailTemplate;

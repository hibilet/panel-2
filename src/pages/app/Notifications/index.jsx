import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { EmptyState } from "../../../components/shared";
import { notificationsColumns } from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import { useNotifications } from "../../../context";
import {
	getNotificationTypeLabel,
	resolveNotificationLink,
} from "../../../lib/notifications";
import strings from "../../../localization";

const Notifications = () => {
	const [, setLocation] = useLocation();
	const { items, unreadCount, loading, markRead, markAllRead } =
		useNotifications();
	const [unreadOnly, setUnreadOnly] = useState(true);
	const [typeFilter, setTypeFilter] = useState("");

	const types = useMemo(() => {
		const set = new Set((items ?? []).map((n) => n.type).filter(Boolean));
		return Array.from(set).sort();
	}, [items]);

	const filtered = useMemo(() => {
		let list = items ?? [];
		if (unreadOnly) list = list.filter((n) => !n.readAt);
		if (typeFilter) list = list.filter((n) => n.type === typeFilter);
		return list;
	}, [items, unreadOnly, typeFilter]);

	const handleRowClick = (row) => {
		if (!row.readAt) markRead(row.id);
		const link = resolveNotificationLink(row);
		if (link) {
			if (link.startsWith("http")) {
				window.open(link, "_blank", "noopener");
			} else {
				setLocation(link);
			}
		}
	};

	return (
		<div className="mx-auto max-w-5xl space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">
					{strings("page.notifications.title")}
					{unreadCount > 0 && (
						<span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-700">
							{unreadCount}
						</span>
					)}
				</h1>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<button
						type="button"
						onClick={markAllRead}
						disabled={unreadCount === 0}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<i className="fa-solid fa-check-double" aria-hidden />
						{strings("page.notifications.markAllRead")}
					</button>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={() => setUnreadOnly(true)}
					className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
						unreadOnly
							? "border-slate-900 bg-slate-900 text-white"
							: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
					}`}
				>
					{strings("page.notifications.unreadOnly")}
				</button>
				<button
					type="button"
					onClick={() => setUnreadOnly(false)}
					className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
						!unreadOnly
							? "border-slate-900 bg-slate-900 text-white"
							: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
					}`}
				>
					{strings("page.notifications.all")}
				</button>
				{types.length > 0 && (
					<select
						name="typeFilter"
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value)}
						aria-label={strings("page.notifications.filterType")}
						className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					>
						<option value="">{strings("page.notifications.allTypes")}</option>
						{types.map((t) => (
							<option key={t} value={t}>
								{getNotificationTypeLabel(t)}
							</option>
						))}
					</select>
				)}
			</div>

			{!loading && filtered.length === 0 ? (
				<EmptyState
					icon="fa-bell-slash"
					title={strings("page.notifications.empty")}
					description={strings("page.notifications.emptyDesc")}
				/>
			) : (
				<DataTable
					data={filtered}
					columns={notificationsColumns}
					getRowKey={(r) => r.id ?? r._id}
					onRowClick={handleRowClick}
					loading={loading}
				/>
			)}
		</div>
	);
};

export default Notifications;

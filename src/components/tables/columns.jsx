import dayjs from "dayjs";
import strings, { formatCurrency } from "../../localization";

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "—");
const formatDateTime = (d) => (d ? dayjs(d).format("D MMM YYYY, HH:mm") : "—");

export const salesColumns = (extended, onDelete) => [
	{
		key: "startDate",
		header: strings("table.sale.startDate"),
		render: (r) => formatDate(r.startDate ?? r.start),
	},
	{
		key: "name",
		header: strings("table.sale.name"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "venue",
		header: strings("table.sale.venue"),
		render: (r) => r.venue ?? "—",
	},
	{
		key: "views",
		header: strings("table.sale.views"),
		align: "right",
		render: (r) => r.views?.toLocaleString() ?? "—",
	},
	{
		key: "reservations",
		header: strings("table.sale.reservations"),
		align: "right",
		render: (r) => r.reservations?.toLocaleString() ?? "—",
	},
	{
		key: "revenue",
		header: strings("table.sale.revenue"),
		align: "right",
		render: (r) =>
			(r.revenue ?? r.sales) != null
				? formatCurrency(r.revenue ?? r.sales)
				: "—",
	},
	...(extended && onDelete
		? [
				{
					key: "delete",
					header: strings("table.sale.delete"),
					align: "right",
					render: (r) =>
						r.id ? (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onDelete(r.id);
								}}
								className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-200"
								aria-label={strings("common.ariaDelete")}
							>
								{strings("common.delete")}
							</button>
						) : (
							"—"
						),
				},
			]
		: []),
];

const statusStyles = {
	pending: "bg-amber-100 text-amber-800",
	completed: "bg-emerald-100 text-emerald-800",
	success: "bg-emerald-100 text-emerald-800",
	failed: "bg-red-100 text-red-800",
	refunded: "bg-slate-100 text-slate-600",
};

export const transactionsColumns = [
	{
		key: "id",
		header: strings("table.transaction.id"),
		render: (r) => r.id?.slice(-8) ?? "—",
		className: "font-mono",
	},
	{
		key: "name",
		header: strings("table.transaction.name"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "owner",
		header: strings("table.transaction.owner"),
		render: (r) => r.owner ?? r.sale ?? "—",
	},
	{
		key: "subtotal",
		header: strings("table.transaction.subtotal"),
		align: "right",
		render: (r) =>
			(r.paid ?? r.subtotal) != null
				? formatCurrency(r.paid ?? r.subtotal)
				: "—",
	},
	{
		key: "createdAt",
		header: strings("table.transaction.createdAt"),
		render: (r) => formatDateTime(r.createdAt),
	},
	{
		key: "status",
		header: strings("table.transaction.status"),
		render: (r) => (
			<span
				className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[r.status] ?? "bg-slate-100 text-slate-600"}`}
			>
				{r.status ?? "—"}
			</span>
		),
	},
];

const formatAccountType = (t) => {
	if (!t) return "—";
	const parts = String(t).split(".");
	return parts[parts.length - 1] ?? t;
};

const accountBaseColumns = [
	{
		key: "id",
		header: strings("table.account.id"),
		render: (r) => r.id?.slice(-8) ?? "—",
		className: "font-mono",
	},
	{
		key: "name",
		header: strings("table.account.name"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "email",
		header: strings("table.account.email"),
		render: (r) => r.email ?? "—",
	},
	{
		key: "createdAt",
		header: strings("table.account.createdAt"),
		render: (r) => formatDateTime(r.createdAt),
	},
];

export const accountsColumns = [
	...accountBaseColumns.slice(0, 3),
	{
		key: "type",
		header: strings("table.account.type"),
		render: (r) => formatAccountType(r.type),
	},
	...accountBaseColumns.slice(3),
];

export const merchantsColumns = accountBaseColumns;
export const customersColumns = accountBaseColumns;

export const linksColumns = [
	{
		key: "image",
		header: strings("table.link.image"),
		render: (r) =>
			r.image ? (
				<img
					src={r.image}
					alt=""
					className="h-10 w-10 rounded-lg object-cover"
				/>
			) : (
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
					<i className="fa-solid fa-image text-sm" aria-hidden />
				</div>
			),
	},
	{
		key: "title",
		header: strings("table.link.title"),
		headerCell: true,
		render: (r) => r.title ?? "—",
	},
	{
		key: "slug",
		header: strings("table.link.slug"),
		render: (r) => r.slug ?? "—",
		className: "font-mono",
	},
	{
		key: "reservations",
		header: strings("table.link.reservations"),
		align: "right",
		render: (r) => r.reservations?.toLocaleString() ?? "—",
	},
	{
		key: "revenue",
		header: strings("table.link.revenue"),
		align: "right",
		render: (r) => (r.revenue != null ? formatCurrency(r.revenue) : "—"),
	},
];

const formatType = (t) => {
	if (!t) return "—";
	const parts = String(t).split(".");
	return parts[parts.length - 1] ?? t;
};

export const providersColumns = [
	{
		key: "id",
		header: strings("table.provider.id"),
		headerCell: true,
		render: (r) => r.id?.slice(-6) ?? "—",
		className: "font-mono",
	},
	{
		key: "name",
		header: strings("table.provider.name"),
		render: (r) => r.name ?? "—",
	},
	{
		key: "type",
		header: strings("table.provider.type"),
		render: (r) => formatType(r.type),
	},
	{
		key: "createdAt",
		header: strings("table.provider.createdAt"),
		render: (r) => formatDateTime(r.createdAt),
	},
];

export const venuesColumns = [
	// {
	// 	key: "id",
	// 	header: strings("table.venue.id"),
	// 	render: (r) => (r.id ?? r._id)?.slice(-8) ?? "—",
	// 	className: "font-mono",
	// },
	{
		key: "name",
		header: strings("table.venue.name"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "owner",
		header: strings("table.venue.owner"),
		render: (r) =>
			typeof r.owner === "object" && r.owner?.name
				? r.owner.name
				: r.owner ?? "—",
	},
	{
		key: "address",
		header: strings("table.venue.address"),
		render: (r) => r.address ?? "—",
	},
	{
		key: "category",
		header: strings("table.venue.category"),
		render: (r) =>
			r.category
				? String(r.category).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
				: "—",
	},
	{
		key: "status",
		header: strings("table.venue.status"),
		render: (r) => (
			<span
				className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
					r.status === "active"
						? "bg-emerald-100 text-emerald-700"
						: "bg-slate-100 text-slate-600"
				}`}
			>
				{r.status === "active"
					? strings("common.active")
					: strings("common.inactive")}
			</span>
		),
	},
	{
		key: "createdAt",
		header: strings("table.venue.createdAt"),
		render: (r) => formatDateTime(r.createdAt),
	},
];

export const agreementsColumns = [
	{
		key: "name",
		header: strings("table.agreement.name"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "type",
		header: strings("table.agreement.type"),
		render: (r) =>
			r.type
				? String(r.type).charAt(0).toUpperCase() + String(r.type).slice(1)
				: "—",
	},
	{
		key: "createdAt",
		header: strings("table.agreement.createdAt"),
		render: (r) => formatDateTime(r.createdAt),
	},
];

const formatPrice = (v, currency = "eur") =>
	v != null
		? new Intl.NumberFormat("de-DE", {
				style: "currency",
				currency: (currency || "eur").toUpperCase(),
			}).format(v)
		: "—";

export const ticketColumns = [
	{
		key: "name",
		header: strings("table.ticket.name"),
		headerCell: true,
		render: (r) => r.name || strings("common.untitled"),
	},
	{
		key: "price",
		header: strings("table.ticket.price"),
		align: "right",
		render: (r) => formatPrice(r.price),
	},
	{
		key: "stock",
		header: strings("table.ticket.stock"),
		align: "right",
		render: (r) => r.stock ?? 0,
	},
	{
		key: "reservations",
		header: strings("table.ticket.reservations"),
		align: "right",
		render: (r) => r.reservations ?? 0,
	},
	{
		key: "status",
		header: strings("table.ticket.status"),
		render: (r) => (
			<span
				className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
					r.status === "active"
						? "bg-emerald-100 text-emerald-700"
						: "bg-slate-100 text-slate-600"
				}`}
			>
				{r.status === "active"
					? strings("common.active")
					: strings("common.inactive")}
			</span>
		),
	},
];

export const channelColumns = (getChannelLink, isBaseChannel, CopyButton) => [
	{
		key: "name",
		header: strings("common.name"),
		headerCell: true,
		render: (r) => (
			<div className="flex items-center gap-2">
				<span className="font-medium text-slate-900">
					{isBaseChannel(r)
						? strings("form.channel.baseSaleName")
						: (r.name || strings("common.untitled"))}
				</span>
				{isBaseChannel(r) && (
					<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
						{strings("form.channel.default")}
					</span>
				)}
			</div>
		),
	},
	{
		key: "views",
		header: strings("form.channel.views"),
		align: "right",
		render: (r) => (r.views ?? 0).toLocaleString(),
	},
	{
		key: "sales",
		header: strings("form.channel.sales"),
		align: "right",
		render: (r) => (r.sales ?? 0).toLocaleString(),
	},
	{
		key: "conv",
		header: strings("form.channel.conv"),
		align: "right",
		render: (r) =>
			(r.views ?? 0) > 0
				? `${(((r.sales ?? 0) / r.views) * 100).toFixed(1)}%`
				: "N/A",
	},
	{
		key: "link",
		header: strings("form.channel.link"),
		render: (r) => {
			const link = getChannelLink(r.id);
			return link ? (
				<span className="flex items-center gap-2">
					<a
						href={link}
						target="_blank"
						rel="noreferrer"
						onClick={(e) => e.stopPropagation()}
						className="text-sm text-slate-600 underline hover:text-slate-900"
					>
						{strings("form.channel.open")}
					</a>
					<CopyButton text={link} stopPropagation />
				</span>
			) : (
				"—"
			);
		},
	},
];

export const readerColumns = (onGetLink) => [
	{
		key: "name",
		header: strings("common.name"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "email",
		header: strings("form.transaction.email"),
		render: (r) => r.email ?? "—",
	},
	{
		key: "link",
		header: strings("form.channel.link"),
		align: "right",
		render: (r) => (
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onGetLink(r);
				}}
				className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm hover:bg-slate-50"
				aria-label={strings("form.reader.ariaGetLink")}
			>
				🔗
			</button>
		),
	},
];

export const guestColumns = (formatDateFn) => [
	{
		key: "name",
		header: strings("form.guest.tableName"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "email",
		header: strings("form.guest.tableEmail"),
		render: (r) => r.email ?? "—",
	},
	{
		key: "product",
		header: strings("form.guest.tableProduct"),
		render: (r) => r.product ?? "—",
	},
	{
		key: "count",
		header: strings("form.guest.tableQuantity"),
		render: (r) => r.count ?? 0,
	},
	{
		key: "createdAt",
		header: strings("form.guest.tableCreated"),
		render: (r) => formatDateFn(r.createdAt),
	},
];

export const linkSalesColumns = (formatStartDate, getVenueName, onRemove) => [
	{
		key: "name",
		header: strings("table.sale.name"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "venue",
		header: strings("table.sale.venue"),
		render: (r) => getVenueName(r),
	},
	{
		key: "start",
		header: strings("form.link.startDate"),
		render: (r) => formatStartDate(r.start),
	},
	{
		key: "actions",
		header: "",
		className: "w-12",
		render: (r) => (
			<button
				type="button"
				onClick={onRemove(r.id)}
				className="rounded border border-red-200 px-2 py-1 text-sm text-red-700 hover:bg-red-50"
				aria-label={strings("common.ariaDelete")}
			>
				<i className="fa-solid fa-trash" aria-hidden />
			</button>
		),
	},
];

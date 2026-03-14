import { useEffect, useState } from "react";
import { useLocation } from "wouter";

import { get } from "../../../lib/client";
import strings from "../../../localization";
import DataTable from "../../../components/tables/DataTable";
import { salesColumns } from "../../../components/tables/columns";

const mapRows = (rows) =>
	(rows ?? []).map((row) => ({
		...row,
		startDate: row.start ?? row.startDate,
	}));

const Reports = () => {
	const [, setLocation] = useLocation();
	const [pastSales, setPastSales] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		setLoading(true);
		setError(null);
		get("/sales?past=true&revenue=true")
			.then((res) => setPastSales(mapRows(res.data ?? [])))
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadPastEvents")),
			)
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<h1 className="text-2xl font-semibold text-slate-900">
				{strings("page.reports.title")}
			</h1>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
					{error}
				</div>
			)}

			<div className="rounded-xl border border-slate-200 bg-white shadow-sm">
				{pastSales.length === 0 && !loading ? (
					<div className="p-8 text-center text-slate-500">
						<i
							className="fa-solid fa-chart-line mb-3 text-4xl text-slate-300"
							aria-hidden
						/>
						<p>{strings("page.reports.noReports")}</p>
					</div>
				) : (
					<DataTable
						data={pastSales}
						columns={salesColumns(false)}
						getRowKey={(r) => r.id ?? r.name}
						onRowClick={(row) => row.id && setLocation(`/reports/${row.id}`)}
						loading={loading}
					/>
				)}
			</div>
		</div>
	);
};

export default Reports;

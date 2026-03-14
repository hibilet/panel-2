import { Link, useParams } from "wouter";
import strings from "../../../../localization";

const Report = () => {
	const { id } = useParams();

	return (
		<div className="mx-auto max-w-4xl">
			<Link
				href="/reports"
				className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.reports")}
			</Link>
			<div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<dl className="space-y-4">
					<div>
						<dt className="text-sm text-slate-500">{strings("detail.id")}</dt>
						<dd className="font-medium">{id}</dd>
					</div>
					<div>
						<dt className="text-sm text-slate-500">{strings("detail.type")}</dt>
						<dd className="font-medium">—</dd>
					</div>
					<div>
						<dt className="text-sm text-slate-500">
							{strings("detail.period")}
						</dt>
						<dd className="font-medium">—</dd>
					</div>
				</dl>
			</div>
		</div>
	);
};

export default Report;

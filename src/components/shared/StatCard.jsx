const StatCard = ({
	label,
	value,
	loading = false,
	className = "",
	comparison,
}) => {
	if (loading) {
		return (
			<div
				className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
				role="status"
				aria-busy="true"
			>
				<span className="sr-only">Loading {label}</span>
				<div className="h-[14px] w-full max-w-[140px] animate-shimmer rounded" />
				<div className="mt-3 h-8 w-full max-w-[120px] animate-shimmer rounded" />
			</div>
		);
	}

	const hasComparison =
		comparison &&
		comparison.formattedDiff != null &&
		!(Number.isNaN(comparison.diff) || Number.isNaN(comparison.percent));
	const isPositive = hasComparison && comparison.diff > 0;
	const isNegative = hasComparison && comparison.diff < 0;
	const comparisonColor = isPositive
		? "text-emerald-600"
		: isNegative
			? "text-red-600"
			: "text-slate-500";

	return (
		<div
			className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
		>
			<p className="text-sm text-slate-500">{label}</p>
			<p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
			{hasComparison && (
				<p className={`mt-1 text-sm font-medium ${comparisonColor}`}>
					{comparison.diff >= 0 ? "+" : ""}
					{comparison.formattedDiff}
					{" "}
					({comparison.percent >= 0 ? "+" : ""}
					{comparison.percent.toFixed(1)}%)
					{comparison.label && (
						<span className="ml-1 font-normal text-slate-500">
							{comparison.label}
						</span>
					)}
				</p>
			)}
		</div>
	);
};

export default StatCard;

const StatCard = ({ label, value, loading = false, className = "" }) => {
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

	return (
		<div
			className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
		>
			<p className="text-sm text-slate-500">{label}</p>
			<p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
		</div>
	);
};

export default StatCard;

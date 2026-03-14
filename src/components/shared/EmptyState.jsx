const EmptyState = ({
	icon = "fa-inbox",
	title,
	description,
	action,
	variant = "default",
	className = "",
}) => {
	const variants = {
		default: "border-slate-200 bg-slate-50/50",
		amber: "border-amber-200 bg-amber-50",
	};
	const iconVariants = {
		default: "bg-slate-200 text-slate-500",
		amber: "bg-amber-100 text-amber-600",
	};

	return (
		<div
			className={`rounded-xl border-2 border-dashed p-12 text-center animate-fade-in ${variants[variant]} ${className}`}
		>
			<div
				className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${iconVariants[variant]}`}
			>
				<i className={`fa-solid ${icon} text-2xl`} aria-hidden />
			</div>
			<h3 className="text-base font-medium text-slate-700">{title}</h3>
			{description && (
				<p className="mt-2 text-sm text-slate-500">{description}</p>
			)}
			{action && <div className="mt-6">{action}</div>}
		</div>
	);
};

export default EmptyState;

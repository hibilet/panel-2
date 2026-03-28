/**
 * Reusable circular ring for step / quota progress (determinate).
 */
const CircularProgress = ({
	value = 0,
	max = 1,
	size = 52,
	strokeWidth = 5,
	trackClassName = "stroke-slate-200",
	progressClassName = "stroke-slate-900",
	className = "",
	"aria-label": ariaLabel,
	children,
}) => {
	const safeMax = Math.max(max, 1);
	const pct = Math.min(100, Math.round((value / safeMax) * 100));
	const half = size / 2;
	const r = half - strokeWidth / 2;
	const c = 2 * Math.PI * r;
	const offset = c * (1 - value / safeMax);

	return (
		<div
			className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
			style={{ width: size, height: size }}
		>
			<svg
				className="-rotate-90"
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				role="img"
				aria-label={ariaLabel ?? `Progress ${pct} percent`}
			>
				<title>{ariaLabel ?? `${pct}% complete`}</title>
				<circle
					className={`fill-none ${trackClassName}`}
					cx={half}
					cy={half}
					r={r}
					strokeWidth={strokeWidth}
				/>
				<circle
					className={`fill-none ${progressClassName}`}
					cx={half}
					cy={half}
					r={r}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={c}
					strokeDashoffset={Number.isFinite(offset) ? offset : c}
				/>
			</svg>
			{children != null && (
				<span className="pointer-events-none absolute inset-0 flex items-center justify-center">
					{children}
				</span>
			)}
		</div>
	);
};

export { CircularProgress };

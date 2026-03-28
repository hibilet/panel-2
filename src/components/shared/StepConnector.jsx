/**
 * Arrow between progress steps; shows a check “checkbox” badge when the prior step is done.
 */
const StepConnector = ({ complete }) => (
	<div
		className="relative flex h-[52px] w-12 shrink-0 items-center justify-center self-start"
		aria-hidden
	>
		<i
			className={`fa-solid fa-arrow-right text-xl ${
				complete ? "text-emerald-600/35" : "text-slate-300"
			}`}
		/>
		{complete ? (
			<span
				className="absolute -right-0.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded border border-emerald-600 bg-white text-emerald-600 shadow-sm ring-2 ring-slate-50"
				title="Step complete"
			>
				<i className="fa-solid fa-check text-[9px]" aria-hidden />
			</span>
		) : null}
	</div>
);

export { StepConnector };

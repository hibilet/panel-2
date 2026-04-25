const SearchBar = ({ value, onChange, placeholder, className = "" }) => {
	return (
		<div className={`relative w-full ${className}`}>
			<i
				className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
				aria-hidden
			/>
			<input
				type="text"
				value={value ?? ""}
				onChange={(e) => onChange?.(e.target.value)}
				placeholder={placeholder}
				className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
			/>
			{value && (
				<button
					type="button"
					onClick={() => onChange?.("")}
					aria-label="Clear"
					className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
				>
					<i className="fa-solid fa-xmark text-sm" aria-hidden />
				</button>
			)}
		</div>
	);
};

export default SearchBar;

import { useCallback, useEffect, useRef, useState } from "react";

const baseClass =
	"mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelClass = "block text-sm font-medium text-slate-700";

const CONTEXT_CONFIG = {
	events: {
		placeholder: "Eg: Chillout Festival 2024",
		searchPlaceholder: "Search events…",
		emptyText: "No events found",
	},
	venues: {
		placeholder: "Eg: Main Hall",
		searchPlaceholder: "Search venues…",
		emptyText: "No venues found",
	},
};

const AsyncSearchInput = ({
	label,
	id,
	name,
	value = "",
	onChange,
	onSelect,
	searchFn,
	context = "events",
	placeholder,
	disabled,
	className = "",
	renderOption,
	getOptionLabel = (item) => item?.name ?? item?.title ?? "—",
	getOptionValue = (item) => item?.id ?? item?.slug ?? "",
	minChars = 1,
	debounceMs = 300,
	...rest
}) => {
	const [query, setQuery] = useState("");
	const [options, setOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [highlightIndex, setHighlightIndex] = useState(-1);
	const containerRef = useRef(null);
	const inputRef = useRef(null);
	const debounceRef = useRef(null);

	const config = CONTEXT_CONFIG[context] ?? CONTEXT_CONFIG.events;
	const inputId = id ?? name;

	const doSearch = useCallback(
		async (q) => {
			if (!searchFn || (minChars > 0 && (!q || q.length < minChars))) {
				setOptions([]);
				return;
			}
			setLoading(true);
			try {
				const res = await searchFn(q);
				const items = Array.isArray(res) ? res : (res?.data ?? []);
				setOptions(items);
				setHighlightIndex(-1);
			} catch {
				setOptions([]);
			} finally {
				setLoading(false);
			}
		},
		[searchFn, minChars],
	);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => doSearch(query), debounceMs);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, debounceMs, doSearch]);

	const handleSelect = useCallback(
		(item) => {
			if (onSelect) onSelect(item);
			if (onChange) onChange(getOptionValue(item));
			setQuery("");
			setOptions([]);
			setOpen(false);
		},
		[onSelect, onChange, getOptionValue],
	);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				setOpen(false);
			}
		};
		const handleKeyDown = (e) => {
			if (!open || options.length === 0) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlightIndex((i) => (i < options.length - 1 ? i + 1 : 0));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlightIndex((i) => (i > 0 ? i - 1 : options.length - 1));
			} else if (
				e.key === "Enter" &&
				highlightIndex >= 0 &&
				options[highlightIndex]
			) {
				e.preventDefault();
				handleSelect(options[highlightIndex]);
			} else if (e.key === "Escape") {
				setOpen(false);
			}
		};
		window.addEventListener("click", handleClickOutside);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("click", handleClickOutside);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [open, options, highlightIndex, handleSelect]);

	const handleInputChange = (e) => {
		const v = e.target.value;
		setQuery(v);
		setOpen(true);
		if (!v && onChange) onChange("");
	};

	const handleFocus = () => setOpen(true);

	const isControlled = value !== undefined && value !== "";
	const displayValue = isControlled ? value : query;
	const showDropdown = open && (query.length >= minChars || options.length > 0);

	const inputEl = (
		<div ref={containerRef} className="relative">
			<input
				ref={inputRef}
				id={inputId}
				name={name}
				type="text"
				value={displayValue}
				onChange={handleInputChange}
				onFocus={handleFocus}
				placeholder={placeholder ?? config.placeholder}
				disabled={disabled}
				autoComplete="off"
				role="combobox"
				aria-expanded={showDropdown}
				aria-autocomplete="list"
				aria-controls={showDropdown ? `${inputId}-listbox` : undefined}
				aria-activedescendant={
					highlightIndex >= 0 && options[highlightIndex]
						? `${inputId}-option-${highlightIndex}`
						: undefined
				}
				className={`${baseClass} ${className}`.trim()}
				{...rest}
			/>
			{loading && (
				<span
					className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
					aria-hidden
				>
					<i className="fa-solid fa-spinner fa-spin" />
				</span>
			)}
			{showDropdown && (
				<div
					id={`${inputId}-listbox`}
					role="listbox"
					className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
				>
					{options.length === 0 && !loading ? (
						<div className="px-3 py-2 text-sm text-slate-500">
							{config.emptyText}
						</div>
					) : (
						options.map((item, i) => (
							<button
								key={getOptionValue(item) || i}
								id={`${inputId}-option-${i}`}
								type="button"
								role="option"
								aria-selected={highlightIndex === i}
								tabIndex={-1}
								className={`w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-slate-50 ${
									highlightIndex === i
										? "bg-slate-100 text-slate-900"
										: "text-slate-700"
								}`}
								onMouseEnter={() => setHighlightIndex(i)}
								onClick={() => handleSelect(item)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleSelect(item);
									}
								}}
							>
								{renderOption ? renderOption(item) : getOptionLabel(item)}
							</button>
						))
					)}
				</div>
			)}
		</div>
	);

	if (!label) return inputEl;
	return (
		<label htmlFor={inputId} className={labelClass}>
			{label}
			{inputEl}
		</label>
	);
};

export default AsyncSearchInput;

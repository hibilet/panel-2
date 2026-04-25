import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchesQuery, normalize } from "../../utils/search";

const labelClass = "block text-sm font-medium text-slate-700";
const triggerBase =
	"mt-1 flex w-full flex-wrap items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus-within:border-slate-500 focus-within:outline-none focus-within:ring-1 focus-within:ring-slate-500";
const triggerDisabled =
	"bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200";
const triggerError =
	"border-red-500 focus-within:border-red-500 focus-within:ring-red-500";
const inputBase =
	"flex-1 min-w-[80px] bg-transparent outline-none placeholder-slate-400 disabled:cursor-not-allowed";

const SearchableDropdown = ({
	label,
	id,
	name,
	value,
	onChange,
	multi = false,
	searchFn,
	options,
	getOptionLabel = (item) => item?.name ?? item?.title ?? "-",
	getOptionValue = (item) => item?.id ?? "",
	renderOption,
	placeholder,
	searchPlaceholder,
	emptyText = "No results",
	disabled,
	error,
	className = "",
	minChars = 0,
	debounceMs = 300,
	...rest
}) => {
	const inputId = id ?? name;
	const containerRef = useRef(null);
	const inputRef = useRef(null);
	const debounceRef = useRef(null);

	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [asyncOptions, setAsyncOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [highlightIndex, setHighlightIndex] = useState(-1);
	const [selectedCache, setSelectedCache] = useState({});

	const isAsync = typeof searchFn === "function";

	const valueArray = useMemo(() => {
		if (multi) return Array.isArray(value) ? value : [];
		return value ? [value] : [];
	}, [multi, value]);

	const resolveItem = useCallback(
		(id) => {
			if (id == null || id === "") return null;
			const fromOptions = (options ?? []).find(
				(it) => getOptionValue(it) === id,
			);
			if (fromOptions) return fromOptions;
			const fromAsync = asyncOptions.find((it) => getOptionValue(it) === id);
			if (fromAsync) return fromAsync;
			return selectedCache[id] ?? null;
		},
		[options, asyncOptions, selectedCache, getOptionValue],
	);

	const labelFor = useCallback(
		(id) => {
			const item = resolveItem(id);
			return item ? getOptionLabel(item) : id;
		},
		[resolveItem, getOptionLabel],
	);

	const filteredOptions = useMemo(() => {
		if (isAsync) return asyncOptions;
		const list = options ?? [];
		if (!normalize(query)) return list;
		return list.filter((item) => matchesQuery(getOptionLabel(item), query));
	}, [isAsync, asyncOptions, options, query, getOptionLabel]);

	useEffect(() => {
		if (!isAsync) return undefined;
		if (!open) return undefined;
		if (minChars > 0 && (!query || query.length < minChars)) {
			setAsyncOptions([]);
			return undefined;
		}
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(async () => {
			setLoading(true);
			try {
				const res = await searchFn(query);
				const items = Array.isArray(res) ? res : (res?.data ?? []);
				setAsyncOptions(items);
				setHighlightIndex(-1);
			} catch {
				setAsyncOptions([]);
			} finally {
				setLoading(false);
			}
		}, debounceMs);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [isAsync, open, query, minChars, debounceMs, searchFn]);

	const cacheItem = useCallback(
		(item) => {
			const id = getOptionValue(item);
			if (!id) return;
			setSelectedCache((prev) =>
				prev[id] === item ? prev : { ...prev, [id]: item },
			);
		},
		[getOptionValue],
	);

	const handleSelect = useCallback(
		(item) => {
			const id = getOptionValue(item);
			cacheItem(item);
			if (multi) {
				const current = Array.isArray(value) ? value : [];
				const next = current.includes(id) ? current : [...current, id];
				onChange?.(next);
				setQuery("");
				if (inputRef.current) inputRef.current.focus();
			} else {
				onChange?.(id);
				setQuery("");
				setOpen(false);
			}
		},
		[multi, value, onChange, getOptionValue, cacheItem],
	);

	const handleRemoveChip = useCallback(
		(id) => {
			if (!multi) {
				onChange?.("");
				return;
			}
			const current = Array.isArray(value) ? value : [];
			onChange?.(current.filter((v) => v !== id));
		},
		[multi, value, onChange],
	);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				setOpen(false);
			}
		};
		window.addEventListener("click", handleClickOutside);
		return () => window.removeEventListener("click", handleClickOutside);
	}, []);

	const handleKeyDown = (e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!open) setOpen(true);
			setHighlightIndex((i) =>
				i < filteredOptions.length - 1 ? i + 1 : 0,
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlightIndex((i) =>
				i > 0 ? i - 1 : filteredOptions.length - 1,
			);
		} else if (e.key === "Enter") {
			if (open && highlightIndex >= 0 && filteredOptions[highlightIndex]) {
				e.preventDefault();
				handleSelect(filteredOptions[highlightIndex]);
			}
		} else if (e.key === "Escape") {
			setOpen(false);
		} else if (
			e.key === "Backspace" &&
			multi &&
			!query &&
			valueArray.length > 0
		) {
			handleRemoveChip(valueArray[valueArray.length - 1]);
		}
	};

	const singleSelectedLabel = !multi && value ? labelFor(value) : "";
	const showSingleOverlay = !multi && value && !query;

	const showDropdown =
		open && (isAsync ? true : filteredOptions.length > 0 || !!query);

	return (
		<div>
			{label && (
				<label htmlFor={inputId} className={labelClass}>
					{label}
				</label>
			)}
			<div ref={containerRef} className="relative">
				<div
					className={`${triggerBase} ${disabled ? triggerDisabled : ""} ${
						error ? triggerError : ""
					} ${className}`.trim()}
					onClick={() => {
						if (disabled) return;
						setOpen(true);
						inputRef.current?.focus();
					}}
				>
					{multi &&
						valueArray.map((id) => (
							<span
								key={id}
								className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
							>
								{labelFor(id)}
								{!disabled && (
									<button
										type="button"
										aria-label="Remove"
										onClick={(e) => {
											e.stopPropagation();
											handleRemoveChip(id);
										}}
										className="text-slate-500 hover:text-slate-700"
									>
										<i className="fa-solid fa-xmark text-[10px]" aria-hidden />
									</button>
								)}
							</span>
						))}

					<div className="relative flex flex-1 items-center">
						{showSingleOverlay && (
							<span className="pointer-events-none absolute inset-y-0 left-0 flex items-center truncate text-sm text-slate-900">
								{singleSelectedLabel}
							</span>
						)}
						<input
							ref={inputRef}
							id={inputId}
							name={name}
							type="text"
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								setOpen(true);
							}}
							onFocus={() => setOpen(true)}
							onKeyDown={handleKeyDown}
							placeholder={
								valueArray.length === 0 && !showSingleOverlay
									? (placeholder ?? searchPlaceholder ?? "")
									: ""
							}
							disabled={disabled}
							autoComplete="off"
							role="combobox"
							aria-expanded={showDropdown}
							aria-autocomplete="list"
							aria-controls={
								showDropdown ? `${inputId}-listbox` : undefined
							}
							aria-activedescendant={
								highlightIndex >= 0 && filteredOptions[highlightIndex]
									? `${inputId}-option-${highlightIndex}`
									: undefined
							}
							className={`${inputBase} text-sm ${showSingleOverlay ? "caret-slate-900" : ""}`}
							{...rest}
						/>
					</div>

					{!multi && value && !disabled && (
						<button
							type="button"
							aria-label="Clear"
							onClick={(e) => {
								e.stopPropagation();
								onChange?.("");
								setQuery("");
								inputRef.current?.focus();
							}}
							className="text-slate-400 hover:text-slate-600"
						>
							<i className="fa-solid fa-xmark text-xs" aria-hidden />
						</button>
					)}

					{loading ? (
						<span className="text-slate-400" aria-hidden>
							<i className="fa-solid fa-spinner fa-spin text-xs" />
						</span>
					) : (
						<span className="text-slate-400" aria-hidden>
							<i
								className={`fa-solid fa-chevron-${open ? "up" : "down"} text-xs`}
							/>
						</span>
					)}
				</div>

				{showDropdown && (
					<div
						id={`${inputId}-listbox`}
						role="listbox"
						className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
					>
						{filteredOptions.length === 0 && !loading ? (
							<div className="px-3 py-2 text-sm text-slate-500">
								{emptyText}
							</div>
						) : (
							filteredOptions.map((item, i) => {
								const id = getOptionValue(item);
								const selected = valueArray.includes(id);
								return (
									<button
										key={id || i}
										id={`${inputId}-option-${i}`}
										type="button"
										role="option"
										aria-selected={selected}
										tabIndex={-1}
										className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
											highlightIndex === i
												? "bg-slate-100 text-slate-900"
												: "text-slate-700"
										}`}
										onMouseEnter={() => setHighlightIndex(i)}
										onClick={(e) => {
											e.stopPropagation();
											handleSelect(item);
										}}
									>
										<span className="truncate">
											{renderOption ? renderOption(item) : getOptionLabel(item)}
										</span>
										{selected && (
											<i
												className="fa-solid fa-check text-xs text-slate-500"
												aria-hidden
											/>
										)}
									</button>
								);
							})
						)}
					</div>
				)}
			</div>
			{error && (
				<p
					id={`${inputId}-error`}
					className="mt-1 text-sm text-red-600"
					role="alert"
				>
					{error}
				</p>
			)}
		</div>
	);
};

export default SearchableDropdown;

import { forwardRef } from "react";

const baseClass =
	"block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:placeholder-slate-300";
const labelClass = "block text-sm font-medium text-slate-700";
const adornmentClass =
	"pointer-events-none flex shrink-0 items-center px-3 py-2 text-slate-500 text-sm";

const Input = forwardRef(
	(
		{
			label,
			id,
			name,
			type = "text",
			value,
			onChange,
			placeholder,
			disabled,
			className = "",
			error,
			required,
			startAdornment,
			endAdornment,
			...rest
		},
		ref,
	) => {
		const inputId = id ?? name;
		const hasAdornments = startAdornment != null || endAdornment != null;
		const inputClassName = `
			${baseClass}
			${hasAdornments ? "border-0 rounded-none focus:ring-0 min-w-0" : "mt-1"}
			${startAdornment != null ? "pl-0" : ""}
			${endAdornment != null ? "pr-0" : ""}
			${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
			${className}
		`.trim();
		const inputEl = hasAdornments ? (
			<div
				className={`
					mt-1 flex w-full overflow-hidden rounded-lg border border-slate-300
					focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500
					${error ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500" : ""}
					${disabled ? "bg-slate-100" : "bg-white"}
				`.trim()}
			>
				{startAdornment != null && (
					<span className={`${adornmentClass} border-r border-slate-300 bg-slate-50`}>
						{startAdornment}
					</span>
				)}
				<input
					ref={ref}
					id={inputId}
					name={name}
					type={type}
					required={required}
					{...(value !== undefined && { value })}
					onChange={onChange}
					placeholder={placeholder}
					disabled={disabled}
					className={inputClassName}
					aria-invalid={!!error}
					aria-describedby={error ? `${inputId}-error` : undefined}
					{...rest}
				/>
				{endAdornment != null && (
					<span className={`${adornmentClass} border-l border-slate-300 bg-slate-50`}>
						{endAdornment}
					</span>
				)}
			</div>
		) : (
			<input
				ref={ref}
				id={inputId}
				name={name}
				type={type}
				required={required}
				{...(value !== undefined && { value })}
				onChange={onChange}
				placeholder={placeholder}
				disabled={disabled}
				className={inputClassName}
				aria-invalid={!!error}
				aria-describedby={error ? `${inputId}-error` : undefined}
				{...rest}
			/>
		);
		if (!label && !error) return inputEl;
		return (
			<div>
				{label && (
					<label htmlFor={inputId} className={labelClass}>
						{label}
					</label>
				)}
				{inputEl}
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
	},
);

Input.displayName = "Input";

export default Input;

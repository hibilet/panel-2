import { forwardRef } from "react";

const baseClass =
	"mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelClass = "block text-sm font-medium text-slate-700";

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
			...rest
		},
		ref,
	) => {
		const inputId = id ?? name;
		const inputEl = (
			<input
				ref={ref}
				id={inputId}
				name={name}
				type={type}
				{...(value !== undefined && { value })}
				onChange={onChange}
				placeholder={placeholder}
				disabled={disabled}
				className={`${baseClass} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`.trim()}
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

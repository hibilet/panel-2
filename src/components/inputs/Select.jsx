import { forwardRef } from "react";

const baseClass =
	"mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed";
const labelClass = "block text-sm font-medium text-slate-700";

const Select = forwardRef(
	(
		{
			label,
			id,
			name,
			value,
			onChange,
			onBlur,
			options = [],
			placeholder,
			disabled,
			className = "",
			error,
			...rest
		},
		ref,
	) => {
		const inputId = id ?? name;
		return (
			<div>
				{label && (
					<label htmlFor={inputId} className={labelClass}>
						{label}
					</label>
				)}
				<select
					ref={ref}
					id={inputId}
					name={name}
					{...(value !== undefined ? { value } : {})}
					onChange={onChange}
					onBlur={onBlur}
					disabled={disabled}
					className={`${baseClass} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`.trim()}
					aria-invalid={!!error}
					aria-describedby={error ? `${inputId}-error` : undefined}
					{...rest}
				>
					{placeholder && (
						<option value="" disabled>
							{placeholder}
						</option>
					)}
					{options.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
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

Select.displayName = "Select";

export default Select;

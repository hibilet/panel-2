import { forwardRef } from "react";

const Checkbox = forwardRef(
	({ label, id, name, disabled, className = "", error, ...rest }, ref) => {
		const inputId = id ?? name;
		return (
			<div className={`py-2 ${className}`.trim()}>
				<label
					className={`flex items-center ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
					htmlFor={inputId}
				>
					<input
						ref={ref}
						id={inputId}
						name={name}
						type="checkbox"
						disabled={disabled}
						className="mr-2 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:cursor-not-allowed"
						aria-invalid={!!error}
						aria-describedby={error ? `${inputId}-error` : undefined}
						{...rest}
					/>
					{label && <span className="text-sm text-slate-700">{label}</span>}
				</label>
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

Checkbox.displayName = "Checkbox";

export default Checkbox;

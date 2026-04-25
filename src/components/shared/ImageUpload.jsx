import { useRef, useState } from "react";
import { uploadImage } from "../../lib/imgbb";
import { showToast } from "../../lib/toastStore";
import strings from "../../localization";

const ImageUpload = ({
	value,
	onChange,
	onRemove,
	variant = "button",
	aspectClass = "aspect-[6/1] max-h-32",
	showPreview = true,
	disabled = false,
	accept = "image/*",
	uploadLabel,
	removeLabel,
	extraActions,
}) => {
	const inputRef = useRef(null);
	const [uploading, setUploading] = useState(false);
	const [dragOver, setDragOver] = useState(false);

	const isDisabled = disabled || uploading;

	const handleFile = async (file) => {
		if (!file) return;
		if (!file.type?.startsWith("image/")) {
			showToast("error", strings("imageUpload.invalidType"));
			return;
		}
		setUploading(true);
		try {
			const url = await uploadImage(file);
			onChange?.(url);
		} catch (err) {
			showToast("error", err?.message ?? strings("imageUpload.failed"));
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	const onInputChange = (e) => handleFile(e.target.files?.[0]);

	const onDrop = (e) => {
		e.preventDefault();
		setDragOver(false);
		if (isDisabled) return;
		handleFile(e.dataTransfer.files?.[0]);
	};

	const openPicker = () => {
		if (isDisabled) return;
		inputRef.current?.click();
	};

	const hiddenInput = (
		<input
			ref={inputRef}
			type="file"
			accept={accept}
			className="hidden"
			onChange={onInputChange}
		/>
	);

	if (variant === "dropzone") {
		return (
			<div className="flex flex-col gap-2">
				{hiddenInput}
				<button
					type="button"
					onClick={openPicker}
					onDragOver={(e) => {
						e.preventDefault();
						if (!isDisabled) setDragOver(true);
					}}
					onDragLeave={() => setDragOver(false)}
					onDrop={onDrop}
					disabled={isDisabled}
					className={`relative block w-full overflow-hidden rounded-xl border-2 border-dashed bg-[#111827] outline-none transition-colors hover:opacity-90 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 ${
						dragOver ? "border-slate-400" : "border-slate-200"
					}`}
				>
					<div className={`${aspectClass} w-full p-4`}>
						{value ? (
							<img
								src={value}
								alt=""
								className="h-full w-full object-contain"
							/>
						) : (
							<div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
								<i className="fa-solid fa-image text-4xl" aria-hidden />
								<span className="text-xs">
									{strings("common.dragOrClick")}
								</span>
							</div>
						)}
					</div>
					{uploading && (
						<div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
							<i
								className="fa-solid fa-spinner fa-spin text-2xl text-white"
								aria-hidden
							/>
						</div>
					)}
				</button>
				<div className="flex items-center gap-3">
					{onRemove && value && (
						<button
							type="button"
							onClick={onRemove}
							disabled={isDisabled}
							className="inline-flex w-fit items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
						>
							<i className="fa-solid fa-trash-can" aria-hidden />
							{removeLabel ?? strings("common.remove")}
						</button>
					)}
					{extraActions}
				</div>
			</div>
		);
	}

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				if (!isDisabled) setDragOver(true);
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={onDrop}
			className={`flex flex-wrap items-center gap-2 rounded-lg ${
				dragOver ? "bg-slate-50 ring-2 ring-slate-400" : ""
			}`}
		>
			{hiddenInput}
			<button
				type="button"
				onClick={openPicker}
				disabled={isDisabled}
				className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{uploading ? (
					<i className="fa-solid fa-spinner fa-spin" aria-hidden />
				) : (
					<i className="fa-solid fa-arrow-up-from-bracket" aria-hidden />
				)}
				{uploadLabel ?? strings("common.upload")}
			</button>
			{showPreview && value && (
				<img
					src={value}
					alt="Preview"
					className="h-12 w-12 shrink-0 rounded object-cover"
				/>
			)}
			{onRemove && value && (
				<button
					type="button"
					onClick={onRemove}
					disabled={isDisabled}
					className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
					aria-label={removeLabel ?? strings("common.remove")}
				>
					<i className="fa-solid fa-trash-can" aria-hidden />
				</button>
			)}
			{extraActions}
		</div>
	);
};

export default ImageUpload;

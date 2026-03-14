import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useParams } from "wouter";
import {
	Checkbox,
	FormSection,
	Input,
	Select,
	Textarea,
} from "../../../../components/inputs";
import { useApp } from "../../../../context";
import { post, put } from "../../../../lib/client";
import strings from "../../../../localization";

const toDatetimeLocal = (iso) => {
	if (!iso) return "";
	const d = new Date(iso);
	const pad = (n) => n.toString().padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const compact = (obj) =>
	Object.fromEntries(
		Object.entries(obj).filter(([, v]) => v != null && v !== ""),
	);

const SaleBasic = ({ sale, onSave }) => {
	const { id } = useParams();
	const [, setLocation] = useLocation();
	const fileInputRef = useRef(null);
	const { venues, agreements, providers, getVenuePlans } = useApp();

	const [plans, setPlans] = useState([]);
	const [plansLoading, setPlansLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const isNew = id === "new";
	const loading = !isNew && sale === undefined;

	const defaultValues = useMemo(() => {
		if (!sale)
			return {
				ticketAdornmentPosition: "bottom",
				ticketAdornmentSize: "medium",
				minAge: 18,
				currency: "eur",
				category: "concert",
			};
		const { tracking, agreement, ...rest } = sale;
		return {
			...rest,
			start: toDatetimeLocal(sale.start),
			end: toDatetimeLocal(sale.end),
			stopSaleAt: toDatetimeLocal(sale.stopSaleAt),
			agreement: agreement?.id ?? agreement ?? "",
			venue: sale.venue ?? "",
			plan: sale.plan ?? "",
			provider: sale.provider ?? "",
			ga: tracking?.ga ?? "",
			meta: tracking?.meta ?? "",
			tiktok: tracking?.tiktok ?? "",
			ticketAdornmentPosition: sale.ticketAdornmentPosition ?? "bottom",
			ticketAdornmentSize: sale.ticketAdornmentSize ?? "medium",
			minAge: sale.minAge ?? 18,
			currency: sale.currency ?? "eur",
			category: sale.category ?? "concert",
		};
	}, [sale]);

	const { register, handleSubmit, watch, setValue } = useForm({
		defaultValues,
	});
	const venue = watch("venue");

	useEffect(() => {
		if (!venue) {
			setPlans([]);
			setValue("plan", "");
			return;
		}
		setValue("plan", "");
		setPlansLoading(true);
		getVenuePlans(venue)
			.then((r) => setPlans(r ?? []))
			.catch(() => setPlans([]))
			.finally(() => setPlansLoading(false));
	}, [venue, getVenuePlans, setValue]);

	const onSubmit = async (fd) => {
		setError(null);
		setSaving(true);
		try {
			const tracking = compact({ ga: fd.ga, meta: fd.meta, tiktok: fd.tiktok });
			const payload = compact({
				name: fd.name,
				start: fd.start ? new Date(fd.start).toISOString() : undefined,
				end: fd.end ? new Date(fd.end).toISOString() : undefined,
				hideStart: fd.hideStart,
				hideEnd: fd.hideEnd,
				stopSaleAt: fd.stopSaleAt
					? new Date(fd.stopSaleAt).toISOString()
					: undefined,
				rules: fd.rules,
				ticketAdornment: fd.ticketAdornment,
				ticketAdornmentPosition: fd.ticketAdornmentPosition,
				ticketAdornmentSize: fd.ticketAdornmentSize,
				minAge: fd.minAge,
				venue: fd.venue,
				plan: fd.plan,
				provider: fd.provider,
				agreement: fd.agreement,
				currency: fd.currency,
				category: fd.category,
				...(Object.keys(tracking).length && { tracking }),
				type: "sale.event",
			});
			if (isNew) {
				const res = await post("/sales", payload);
				if (res.data?.id) setLocation(`/sales/${res.data.id}`);
			} else {
				await put(`/sales/${id}`, payload);
				onSave?.();
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="rounded-xl border border-slate-200 bg-white p-8">
				<div className="h-4 w-48 animate-shimmer rounded" />
				<div className="mt-4 h-10 w-full max-w-md animate-shimmer rounded" />
			</div>
		);
	}

	return (
		<form
			key={id}
			id="sale-basic-form"
			onSubmit={handleSubmit(onSubmit)}
			className="overflow-auto"
		>
			<div className="space-y-6">
				{error && (
					<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
						{error}
					</div>
				)}

				<FormSection gridClassName="grid grid-cols-1 gap-4 md:grid-cols-4">
					<div className="md:col-span-4">
						<Input
							label={strings("sale.eventName")}
							type="text"
							{...register("name")}
							placeholder={strings("sale.eventNamePlaceholder")}
						/>
					</div>
					<div>
						<Input
							label={strings("sale.startDateTime")}
							type="datetime-local"
							{...register("start")}
						/>
						<Checkbox
							label={strings("sale.hideStartDate")}
							{...register("hideStart")}
							className="mt-2"
						/>
					</div>
					<div>
						<Input
							label={strings("sale.endDateTime")}
							type="datetime-local"
							{...register("end")}
						/>
						<Checkbox
							label={strings("sale.hideEndDate")}
							{...register("hideEnd")}
							className="mt-2"
						/>
					</div>
					<div>
						<Input
							label={strings("sale.stopSaleAt")}
							type="datetime-local"
							{...register("stopSaleAt")}
						/>
					</div>
				</FormSection>

				<FormSection gridClassName="grid grid-cols-1">
					<label className="block text-sm font-medium text-slate-700">
						{strings("sale.comboTicketLogo")}
						<div className="mt-1 flex items-center gap-2">
							<Input
								type="text"
								{...register("ticketAdornment")}
								placeholder={strings("sale.uploadImagePlaceholder")}
								className="flex-1"
							/>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={(e) => {
									const f = e.target.files?.[0];
									if (f) setValue("ticketAdornment", f.name);
								}}
							/>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								{strings("sale.uploadImage")}
							</button>
						</div>
					</label>
					<section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
						<Select
							label={strings("sale.logoPosition")}
							{...register("ticketAdornmentPosition")}
							placeholder={strings("sale.selectPosition")}
							options={[
								{ value: "top", label: strings("sale.position.top") },
								{ value: "bottom", label: strings("sale.position.bottom") },
								{ value: "left", label: strings("sale.position.left") },
								{ value: "right", label: strings("sale.position.right") },
							]}
						/>
						<Select
							label={strings("sale.logoSize")}
							{...register("ticketAdornmentSize")}
							placeholder={strings("sale.selectSize")}
							options={[
								{ value: "small", label: strings("sale.size.small") },
								{ value: "medium", label: strings("sale.size.medium") },
								{ value: "large", label: strings("sale.size.large") },
							]}
						/>
					</section>
				</FormSection>

				<FormSection
					title={strings("sale.venueSeating")}
					gridClassName="grid grid-cols-1 gap-4 md:grid-cols-3"
				>
					<Select
						label={strings("sale.venue")}
						{...register("venue")}
						options={[
							{ value: "", label: strings("sale.noVenue") },
							...(venues?.map((v) => ({ value: v.id, label: v.name })) ?? []),
						]}
					/>
					<Select
						label={strings("sale.seatingPlan")}
						{...register("plan")}
						disabled={!venue || plansLoading}
						options={[
							{ value: "", label: strings("sale.noSeating") },
							...plans.map((p) => ({ value: p.id, label: p.name })),
						]}
					/>
					<Input
						label={strings("sale.minimumAge")}
						type="number"
						{...register("minAge", { valueAsNumber: true })}
						placeholder={strings("sale.minAgePlaceholder")}
					/>
				</FormSection>

				<FormSection
					title={strings("sale.paymentLegal")}
					gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
				>
					<Select
						label={strings("sale.transactionProvider")}
						{...register("provider")}
						placeholder={strings("sale.selectProvider")}
						options={
							providers?.map((p) => ({ value: p.id, label: p.name ?? p.id })) ??
							[]
						}
					/>
					<Select
						label={strings("sale.currency")}
						{...register("currency")}
						options={[
							{ value: "eur", label: strings("sale.currency.eur") },
							{ value: "chf", label: strings("sale.currency.chf") },
							{ value: "usd", label: strings("sale.currency.usd") },
						]}
					/>
					<Select
						label={strings("sale.salesAgreement")}
						{...register("agreement")}
						placeholder={strings("sale.selectAgreement")}
						options={
							agreements?.map((a) => ({ value: a.id, label: a.name })) ?? []
						}
					/>
					<Select
						label={strings("sale.eventCategory")}
						{...register("category")}
						options={[
							{ value: "concert", label: strings("sale.category.concert") },
							{ value: "festival", label: strings("sale.category.festival") },
							{ value: "tour", label: strings("sale.category.tour") },
							{
								value: "experience",
								label: strings("sale.category.experience"),
							},
						]}
					/>
				</FormSection>

				<FormSection
					title={strings("sale.trackingPixels")}
					gridClassName="grid grid-cols-1 gap-4 md:grid-cols-3"
				>
					<Textarea
						label={strings("sale.ga")}
						{...register("ga")}
						placeholder={strings("sale.trackingPlaceholder")}
						rows={6}
						className="min-h-[120px]"
					/>
					<Textarea
						label={strings("sale.meta")}
						{...register("meta")}
						placeholder={strings("sale.trackingPlaceholder")}
						rows={6}
						className="min-h-[120px]"
					/>
					<Textarea
						label={strings("sale.tiktok")}
						{...register("tiktok")}
						placeholder={strings("sale.trackingPlaceholder")}
						rows={6}
						className="min-h-[120px]"
					/>
				</FormSection>

				<FormSection gridClassName="grid grid-cols-1">
					<Textarea
						label={strings("sale.rules")}
						{...register("rules")}
						placeholder={strings("sale.rulesPlaceholder")}
						className="min-h-[200px]"
					/>
				</FormSection>

				<button
					type="submit"
					disabled={saving}
					className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
				>
					{saving ? (
						<>
							<i className="fa-solid fa-spinner fa-spin" aria-hidden />
							{strings("common.saving")}
						</>
					) : (
						strings("sale.save")
					)}
				</button>
			</div>
		</form>
	);
};

export default SaleBasic;

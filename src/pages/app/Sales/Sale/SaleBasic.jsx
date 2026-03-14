import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useEffect, useRef, useState } from "react";

dayjs.extend(utc);
import { useForm } from "react-hook-form";
import {
	Checkbox,
	Input,
	Select,
	Textarea,
} from "../../../../components/inputs";
import { useApp } from "../../../../context";
import { get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";
import { toId } from "../../../../utils/object";

const SaleBasic = ({ sale, setSale, params: { id } }) => {
	const { venues, agreements, providers, loading: appLoading } = useApp();
	const [plans, setPlans] = useState(null);
	const fileInputRef = useRef(null);

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors },
	} = useForm();
	const venue = watch("venue");

	useEffect(() => {
		if (!venue) {
			setPlans(null);
			return;
		}
		get(`/venues/plans/search?venue=${venue}`)
			.then((r) => setPlans(r.data))
			.catch(() => setPlans([]));
	}, [venue]);

	const CreateSale = async (data) => {
		const res = await post(`/sales`, data);
		setSale(res.data);
	};

	const UpdateSale = async (data) => {
		const res = await put(`/sales/${sale?.id}`, data);
		setSale(res.data);
	};

	useEffect(() => {
		if (!sale || appLoading) return;
		reset({
			...sale,
			start: dayjs.utc(sale?.start).local().format("YYYY-MM-DDTHH:mm"),
			end: dayjs.utc(sale?.end).local().format("YYYY-MM-DDTHH:mm"),
			stopSaleAt: dayjs.utc(sale?.stopSaleAt).local().format("YYYY-MM-DDTHH:mm"),
			venue: toId(sale?.venue),
			plan: toId(sale?.plan),
			agreement: toId(sale?.agreement),
			provider: toId(sale?.provider),
			ga: sale?.tracking?.ga ?? "",
			meta: sale?.tracking?.meta ?? "",
			tiktok: sale?.tracking?.tiktok ?? "",
		});
	}, [sale, appLoading, reset]);

	useEffect(() => {
		const planId = toId(sale?.plan);
		if (planId && plans?.length) setValue("plan", planId);
	}, [sale?.plan, plans, setValue]);

	return (
		<main className="flex h-full flex-col gap-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="text-lg font-medium text-slate-900">
					{strings("form.sale.eventDetails")}
				</h2>
				<button
					type="button"
					className="inline-flex items-center gap-2 justify-start rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
					onClick={handleSubmit(id === "new" ? CreateSale : UpdateSale)}
				>
					<i className="fa-solid fa-save" aria-hidden="true" />
					Save
				</button>
			</div>
			{/* Basic Information */}
			<section className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="md:col-span-4">
					<Input
						placeholder={strings("sale.eventNamePlaceholder")}
						label={strings("sale.eventName")}
						type="text"
						{...register("name", { required: true })}
						error={errors.name?.message}
					/>
				</div>
				<div>
					<Input
						label={strings("sale.startDateTime")}
						type="datetime-local"
						{...register("start", { required: true })}
						error={errors.start?.message}
					/>
					<Checkbox
						label={strings("sale.hideStartDate")}
						{...register("hideStart")}
					/>
				</div>
				<div>
					<Input
						label={strings("sale.endDateTime")}
						type="datetime-local"
						{...register("end", { required: true })}
						error={errors.end?.message}
					/>
					<Checkbox
						label={strings("sale.hideEndDate")}
						{...register("hideEnd")}
					/>
				</div>
				<div>
					<Input
						label={strings("sale.stopSaleAt")}
						type="datetime-local"
						{...register("stopSaleAt", { required: true })}
						error={errors.stopSaleAt?.message}
					/>
				</div>
			</section>

			{/* Venue and Seating Plan */}
			<h2 className="text-lg font-medium text-slate-900">
				{strings("form.sale.venueDetails")}
			</h2>
			<section className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 gap-4 md:grid-cols-3">
				<Select
					label={strings("sale.venue")}
					disabled={sale?.plan}
					{...register("venue", { required: true })}
					options={[
						{ value: "", label: strings("sale.noVenue") },
						...(venues?.map((v) => ({ value: v.id, label: v.name })) ?? []),
					]}
					error={errors.venue?.message}
				/>
				<Select
					label={strings("sale.seatingPlan")}
					{...register("plan", { setValueAs: (v) => v || null })}
					disabled={!venue || !plans?.length || sale?.plan}
					options={[
						{ value: "", label: strings("sale.noSeating") },
						...(plans || []).map((p) => ({ value: p.id, label: p.name })),
					]}
				/>
				<Input
					label={strings("sale.minimumAge")}
					type="number"
					{...register("minAge", { valueAsNumber: true })}
					placeholder={strings("sale.minAgePlaceholder")}
					error={errors.minAge?.message}
				/>
			</section>

			{/* Payment information */}
			<h2 className="text-lg font-medium text-slate-900">
				{strings("form.sale.paymentInformation")}
			</h2>
			<section className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 gap-4 md:grid-cols-4">
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
			</section>

			{/* Tracking and Advertising */}
			<h2 className="text-lg font-medium text-slate-900">
				{strings("form.sale.trackingAndAdvertising")}
			</h2>
			<section className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 gap-4 md:grid-cols-3">
				<Textarea
					label={strings("sale.ga")}
					{...register("tracking.ga")}
					placeholder={strings("sale.trackingPlaceholder")}
					rows={6}
					className="min-h-[120px]"
				/>
				<Textarea
					label={strings("sale.meta")}
					{...register("tracking.meta")}
					placeholder={strings("sale.trackingPlaceholder")}
					rows={6}
					className="min-h-[120px]"
				/>
				<Textarea
					label={strings("sale.tiktok")}
					{...register("tracking.tiktok")}
					placeholder={strings("sale.trackingPlaceholder")}
					rows={6}
					className="min-h-[120px]"
				/>
			</section>

			{/* Combo Ticket and Logo */}
			<h2 className="text-lg font-medium text-slate-900">
				{strings("form.sale.comboTicketAndLogo")}
			</h2>
			<section className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 gap-4 md:grid-cols-1">
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
			</section>

			{/* Event Rules */}
			<h2 className="text-lg font-medium text-slate-900">
				{strings("form.sale.eventRules")}
			</h2>
			<section className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 gap-4 md:grid-cols-1">
				<Textarea
					label={strings("sale.rules")}
					{...register("rules")}
					placeholder={strings("sale.rulesPlaceholder")}
					rows={6}
				/>
			</section>
		</main>
	);
};

export default SaleBasic;

import { useState } from "react";
import { COUNTRIES } from "../../lib/vat";
import strings from "../../localization";
import { Input, Select, Textarea } from "../inputs";

const TAX_PROFILE_OPTIONS = [
	{ value: "", label: "auto" },
	{ value: "eu", label: "eu" },
	{ value: "simple", label: "simple" },
];

const COUNTRY_OPTIONS = [{ value: "", label: "-" }, ...COUNTRIES];

const SellerBlock = ({ register, errors, needsSetup = false }) => {
	const [open, setOpen] = useState(needsSetup);
	return (
		<div
			className={`rounded-lg border ${needsSetup ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`}
		>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
			>
				<span className="inline-flex items-center gap-2">
					<i className="fa-solid fa-file-invoice text-slate-500" aria-hidden />
					{strings("form.realm.seller")}
					{needsSetup && (
						<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
							<i className="fa-solid fa-triangle-exclamation" aria-hidden />
							{strings("form.realm.sellerNeedsSetup")}
						</span>
					)}
				</span>
				<i
					className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`}
					aria-hidden
				/>
			</button>
			{open && (
				<div className="space-y-4 border-t border-slate-200 px-4 py-4">
					<p className="text-xs text-slate-500">
						{strings("form.realm.sellerHelp")}
					</p>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Select
							label={`${strings("form.realm.sellerCountry")} *`}
							{...register("seller.country")}
							options={COUNTRY_OPTIONS}
							error={errors?.seller?.country?.message}
						/>
						<Input
							label={`${strings("form.realm.sellerDefaultRate")} *`}
							type="number"
							step="0.01"
							min="0"
							max="1"
							{...register("seller.defaultRate")}
							placeholder="0.21"
						/>
						<Select
							label={strings("form.realm.sellerTaxProfile")}
							{...register("seller.taxProfile")}
							options={TAX_PROFILE_OPTIONS}
						/>
						<Input
							label={strings("form.realm.sellerInvoicePrefix")}
							{...register("seller.invoiceNumberPrefix")}
							placeholder="HIB"
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Input
							label={strings("form.realm.sellerLegalName")}
							{...register("seller.legalName")}
							placeholder="Hibilet B.V."
						/>
						<Input
							label={strings("form.realm.sellerTradeName")}
							{...register("seller.tradeName")}
							placeholder="Hibilet"
						/>
						<Input
							label={strings("form.realm.sellerVatId")}
							{...register("seller.vatId")}
							placeholder="NL999999B01"
						/>
						<Input
							label={strings("form.realm.sellerRegistry")}
							{...register("seller.registry")}
							placeholder="KVK12345678"
						/>
						<Input
							label={strings("form.realm.sellerIban")}
							{...register("seller.iban")}
							placeholder="NL00 INGB 0000 0000 00"
						/>
						<Input
							label={strings("form.realm.sellerEmail")}
							type="email"
							{...register("seller.email")}
							placeholder="billing@example.com"
						/>
						<Input
							label={strings("form.realm.sellerPhone")}
							type="tel"
							{...register("seller.phone")}
							placeholder="+31 20 000 0000"
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Input
							label={strings("form.realm.sellerAddressStreet")}
							{...register("seller.address.street")}
							placeholder="Damrak 1"
						/>
						<Input
							label={strings("form.realm.sellerAddressCity")}
							{...register("seller.address.city")}
							placeholder="Amsterdam"
						/>
						<Input
							label={strings("form.realm.sellerAddressZip")}
							{...register("seller.address.zip")}
							placeholder="1011AA"
						/>
						<Select
							label={strings("form.realm.sellerAddressCountry")}
							{...register("seller.address.country")}
							options={COUNTRY_OPTIONS}
						/>
					</div>

					<Textarea
						label={strings("form.realm.sellerInvoiceFooter")}
						{...register("seller.invoiceFooter")}
						rows={2}
						placeholder="Thanks for using Hibilet."
					/>
				</div>
			)}
		</div>
	);
};

export default SellerBlock;

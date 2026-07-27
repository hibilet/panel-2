import { useState } from "react";
import { COUNTRIES } from "../../lib/vat";
import strings from "../../localization";
import { Input, Select, Textarea } from "../inputs";

const TAX_PROFILE_OPTIONS = [
	{ value: "", label: strings("taxProfile.auto") },
	{ value: "eu", label: strings("taxProfile.eu") },
	{ value: "simple", label: strings("taxProfile.simple") },
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
							placeholder={strings("form.realm.sellerInvoicePrefixPlaceholder")}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Input
							label={strings("form.realm.sellerLegalName")}
							{...register("seller.legalName")}
							placeholder={strings("form.realm.sellerLegalNamePlaceholder")}
						/>
						<Input
							label={strings("form.realm.sellerTradeName")}
							{...register("seller.tradeName")}
							placeholder={strings("form.realm.sellerTradeNamePlaceholder")}
						/>
						<Input
							label={strings("form.realm.sellerVatId")}
							{...register("seller.vatId")}
							placeholder={strings("form.realm.sellerVatIdPlaceholder")}
						/>
						<Input
							label={strings("form.realm.sellerRegistry")}
							{...register("seller.registry")}
							placeholder={strings("form.realm.sellerRegistryPlaceholder")}
						/>
						<Input
							label={strings("form.realm.sellerIban")}
							{...register("seller.iban")}
							placeholder={strings("form.realm.sellerIbanPlaceholder")}
						/>
						<Input
							label={strings("form.realm.sellerEmail")}
							type="email"
							{...register("seller.email")}
							placeholder={strings("form.realm.sellerEmailPlaceholder")}
						/>
						<Input
							label={strings("form.realm.sellerPhone")}
							type="tel"
							{...register("seller.phone")}
							placeholder={strings("page.settings.phonePlaceholder")}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Input
							label={strings("form.realm.sellerAddressStreet")}
							{...register("seller.address.street")}
							placeholder={strings("form.realm.sellerStreetPlaceholder")}
						/>
						<Input
							label={strings("form.realm.sellerAddressCity")}
							{...register("seller.address.city")}
							placeholder={strings("form.realm.sellerCityPlaceholder")}
						/>
						<Input
							label={strings("form.realm.sellerAddressZip")}
							{...register("seller.address.zip")}
							placeholder={strings("form.realm.sellerZipPlaceholder")}
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
						placeholder={strings("form.realm.sellerInvoiceFooterPlaceholder")}
					/>
				</div>
			)}
		</div>
	);
};

export default SellerBlock;

import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { NUMERIC_TO_A2, countryName } from "../../lib/countries";

// World atlas country shapes (geometry only, no user data leaves).
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Light -> dark blue by buyer share. Uncovered countries stay slate.
const fillFor = (count, max) => {
	if (!count) return "#e2e8f0";
	const t = Math.min(1, count / max);
	const lo = [219, 234, 254]; // blue-100
	const hi = [29, 78, 216]; // blue-700
	const c = lo.map((l, i) => Math.round(l + (hi[i] - l) * t));
	return `rgb(${c[0]},${c[1]},${c[2]})`;
};

// Choropleth of buyer counts by country. Click a country (with data) to drill
// into its cities. `counts` = { A2: number }.
const GeoMap = ({ counts = {}, selected, onSelect }) => {
	const max = Math.max(1, ...Object.values(counts));
	return (
		<ComposableMap
			projection="geoMercator"
			projectionConfig={{ scale: 150, center: [12, 47] }}
			width={620}
			height={440}
			style={{ width: "100%", height: "auto" }}
		>
			<Geographies geography={GEO_URL}>
				{({ geographies }) =>
					geographies.map((geo) => {
						const a2 = NUMERIC_TO_A2[Number(geo.id)];
						const count = a2 ? counts[a2] ?? 0 : 0;
						const isSel = a2 && a2 === selected;
						return (
							<Geography
								key={geo.rsmKey}
								geography={geo}
								onClick={() => count && onSelect?.(a2)}
								stroke={isSel ? "#1e3a8a" : "#ffffff"}
								strokeWidth={isSel ? 1.5 : 0.5}
								style={{
									default: { fill: fillFor(count, max), outline: "none", cursor: count ? "pointer" : "default" },
									hover: { fill: count ? "#1d4ed8" : "#e2e8f0", outline: "none" },
									pressed: { fill: "#1e40af", outline: "none" },
								}}
							>
								<title>{a2 ? `${countryName(a2)}: ${count.toLocaleString()}` : ""}</title>
							</Geography>
						);
					})
				}
			</Geographies>
		</ComposableMap>
	);
};

export default GeoMap;

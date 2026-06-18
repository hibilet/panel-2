import { geoMercator, geoPath } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import { NUMERIC_TO_A2, countryName } from "../../lib/countries";

// World country shapes (geometry only; no user data leaves). Pure ESM render
// via d3-geo - no react-simple-maps (its UMD build calls require() and breaks
// under Vite/React 19).
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const W = 620;
const H = 440;

const fillFor = (count, max) => {
	if (!count) return "#e2e8f0";
	const t = Math.min(1, count / max);
	const lo = [219, 234, 254];
	const hi = [29, 78, 216];
	const c = lo.map((l, i) => Math.round(l + (hi[i] - l) * t));
	return `rgb(${c[0]},${c[1]},${c[2]})`;
};

const GeoMap = ({ counts = {}, selected, onSelect }) => {
	const [features, setFeatures] = useState(null);

	useEffect(() => {
		let alive = true;
		fetch(GEO_URL)
			.then((r) => r.json())
			.then((topo) => {
				if (alive) setFeatures(feature(topo, topo.objects.countries).features);
			})
			.catch(() => alive && setFeatures([]));
		return () => {
			alive = false;
		};
	}, []);

	const path = useMemo(() => {
		if (!features?.length) return null;
		const proj = geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], { type: "FeatureCollection", features });
		return geoPath(proj);
	}, [features]);

	const max = Math.max(1, ...Object.values(counts));

	if (!features) return <p className="p-4 text-sm text-slate-400">Loading map...</p>;
	if (!features.length || !path) return <p className="p-4 text-sm text-slate-400">Map unavailable.</p>;

	return (
		<svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Buyer locations by country">
			{features.map((geo) => {
				const a2 = NUMERIC_TO_A2[Number(geo.id)];
				const count = a2 ? counts[a2] ?? 0 : 0;
				const isSel = a2 && a2 === selected;
				return (
					<path
						key={geo.id}
						d={path(geo)}
						fill={fillFor(count, max)}
						stroke={isSel ? "#1e3a8a" : "#ffffff"}
						strokeWidth={isSel ? 1.4 : 0.4}
						style={{ cursor: count ? "pointer" : "default", outline: "none" }}
						onClick={() => count && onSelect?.(a2)}
					>
						<title>{a2 ? `${countryName(a2)}: ${count.toLocaleString()}` : ""}</title>
					</path>
				);
			})}
		</svg>
	);
};

export default GeoMap;

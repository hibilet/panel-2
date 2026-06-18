import { geoMercator, geoPath } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import { cityCoord } from "../../lib/cityCoords";
import { NUMERIC_TO_A2, countryName } from "../../lib/countries";

// World country shapes (geometry only; no user data leaves). Pure ESM via
// d3-geo - react-simple-maps' UMD build calls require() and breaks under Vite.
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

// Choropleth by country. With a `selected` country it zooms to that country and
// bubbles its cities (size = buyer count), GA-style; otherwise a world view.
const GeoMap = ({ counts = {}, selected, cities = [], onSelect }) => {
	const [features, setFeatures] = useState(null);

	useEffect(() => {
		let alive = true;
		fetch(GEO_URL)
			.then((r) => r.json())
			.then((topo) => alive && setFeatures(feature(topo, topo.objects.countries).features))
			.catch(() => alive && setFeatures([]));
		return () => {
			alive = false;
		};
	}, []);

	const proj = useMemo(() => {
		if (!features?.length) return null;
		const p = geoMercator();
		const target = selected ? features.find((f) => NUMERIC_TO_A2[Number(f.id)] === selected) : null;
		p.fitExtent([[8, 8], [W - 8, H - 8]], target || { type: "FeatureCollection", features });
		return p;
	}, [features, selected]);

	const max = Math.max(1, ...Object.values(counts));
	const bubbles = useMemo(() => {
		if (!selected || !proj) return [];
		const m = Math.max(1, ...cities.map((c) => c.count));
		return cities
			.map((c) => {
				const co = cityCoord(c.key);
				if (!co) return null;
				const [x, y] = proj(co);
				return { name: c.key, count: c.count, x, y, r: 4 + 16 * Math.sqrt(c.count / m) };
			})
			.filter(Boolean)
			.sort((a, b) => b.r - a.r);
	}, [selected, proj, cities]);

	if (!features) return <p className="p-4 text-sm text-slate-400">Loading map...</p>;
	if (!features.length || !proj) return <p className="p-4 text-sm text-slate-400">Map unavailable.</p>;
	const path = geoPath(proj);

	return (
		<svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Buyer locations">
			{features.map((geo, i) => {
				const a2 = NUMERIC_TO_A2[Number(geo.id)];
				const count = a2 ? counts[a2] ?? 0 : 0;
				const isSel = a2 && a2 === selected;
				return (
					<path
						key={geo.id ?? `f${i}`}
						d={path(geo)}
						fill={fillFor(count, max)}
						stroke={isSel ? "#1e3a8a" : "#ffffff"}
						strokeWidth={isSel ? 1.2 : 0.4}
						style={{ cursor: count ? "pointer" : "default", outline: "none" }}
						onClick={() => count && onSelect?.(a2)}
					>
						<title>{a2 ? `${countryName(a2)}: ${count.toLocaleString()}` : ""}</title>
					</path>
				);
			})}
			{bubbles.map((b) => (
				<g key={b.name}>
					<circle cx={b.x} cy={b.y} r={b.r} fill="#2563eb" fillOpacity={0.45} stroke="#1d4ed8" strokeWidth={1}>
						<title>{`${b.name}: ${b.count.toLocaleString()}`}</title>
					</circle>
					{b.r >= 9 && (
						<text x={b.x} y={b.y + 3} textAnchor="middle" fontSize={9} fill="#1e3a8a" style={{ pointerEvents: "none" }}>
							{b.count}
						</text>
					)}
				</g>
			))}
		</svg>
	);
};

export default GeoMap;

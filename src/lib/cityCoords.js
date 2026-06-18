// City -> [lng, lat] for plotting bubbles on the zoomed country map. Stripe
// gives city NAMES only, so we resolve coordinates from this static lookup
// (DACH + Benelux + EU majors - the active markets). Keyed by normalized
// (trimmed, lowercased) name; unknown cities fall back to the side list.
const C = {
	hamburg: [9.99, 53.55], berlin: [13.4, 52.52], wien: [16.37, 48.21],
	dortmund: [7.47, 51.51], "köln": [6.96, 50.94], "düsseldorf": [6.78, 51.23],
	duisburg: [6.76, 51.43], gelsenkirchen: [7.1, 51.52], essen: [7.01, 51.46],
	"münchen": [11.58, 48.14], "frankfurt am main": [8.68, 50.11], frankfurt: [8.68, 50.11],
	wiesbaden: [8.24, 50.08], rotterdam: [4.48, 51.92], mannheim: [8.47, 49.49],
	hamm: [7.82, 51.68], "lünen": [7.52, 51.62], amsterdam: [4.9, 52.37],
	bonn: [7.1, 50.74], bochum: [7.22, 51.48], stuttgart: [9.18, 48.78],
	wuppertal: [7.18, 51.26], "zürich": [8.54, 47.37], bremen: [8.81, 53.08],
	hagen: [7.47, 51.36], "nürnberg": [11.08, 49.45], "offenbach am main": [8.77, 50.1],
	mainz: [8.27, 49.99], grevenbroich: [6.58, 51.09], hanau: [8.92, 50.13],
	utrecht: [5.12, 52.09], herne: [7.22, 51.54], moers: [6.63, 51.45],
	iserlohn: [7.7, 51.37], neuss: [6.69, 51.2], winterthur: [8.72, 47.5],
	werdohl: [7.76, 51.26], leipzig: [12.37, 51.34], dresden: [13.74, 51.05],
	hannover: [9.73, 52.37], "münster": [7.63, 51.96], karlsruhe: [8.4, 49.01],
	augsburg: [10.9, 48.37], basel: [7.59, 47.56], "genève": [6.14, 46.2],
	bern: [7.45, 46.95], salzburg: [13.05, 47.81], graz: [15.44, 47.07],
	linz: [14.29, 48.31], "den haag": [4.3, 52.08], "the hague": [4.3, 52.08],
	eindhoven: [5.47, 51.44], antwerpen: [4.4, 51.22], brussels: [4.35, 50.85],
	bruxelles: [4.35, 50.85], paris: [2.35, 48.86], aachen: [6.08, 50.78],
	bielefeld: [8.53, 52.02], krefeld: [6.58, 51.33], "mönchengladbach": [6.43, 51.19],
	kiel: [10.14, 54.32], "saarbrücken": [6.99, 49.24], freiburg: [7.84, 47.99],
	"oberhausen": [6.86, 51.47], leverkusen: [6.99, 51.03], solingen: [7.08, 51.17],
};

export const cityCoord = (name) => (name ? C[name.trim().toLowerCase()] ?? null : null);

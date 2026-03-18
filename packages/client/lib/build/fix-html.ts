type BuildOutput = { path: string; kind: string };

/**
 * Bug: Bun's bundler links wrong script src in index.html when splitting=true.
 * Fix: Manually replace the incorrect script src with the actual entrypoint JS from build outputs.
 **/
export async function fixHtml(outputs: BuildOutput[], outdir: string) {
	const entry = outputs.find(
		(o) => o.kind === "entry-point" && o.path.endsWith(".js"),
	);
	if (!entry) throw new Error("Entry point not found");

	const rel = entry.path.includes("/dist/")
		? `/${entry.path.split("/dist/")[1]}`
		: `/${entry.path.replace(/^(\.\/)?dist\//, "")}`;

	const htmlPath = `${outdir}/index.html`;
	let html = await Bun.file(htmlPath).text();

	html = html.replace(/src="[^"]*\.js"/, `src="${rel}"`);
	html = html.replaceAll('src="./', 'src="/').replaceAll('href="./', 'href="/');

	await Bun.write(htmlPath, html);
}

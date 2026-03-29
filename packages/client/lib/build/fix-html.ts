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

	const root = entry.path.includes("/dist/")
		? `/${entry.path.split("/dist/")[1]}`
		: `/${entry.path.replace(/^(\.\/)?dist\//, "")}`;

	const htmlPath = `${outdir}/index.html`;
	const html = await Bun.file(htmlPath).text();

	// Fix script src and link href to be root-relative (e.g., ./chunks/ -> /chunks/)
	const fixedHtml = html
		.replaceAll('src="./', 'src="/')
		.replaceAll('href="./', 'href="/')
		// Ensure the main bundle entry is definitely root-relative
		.replace(/src="[^"]*\.js"/, `src="${root}"`);

	await Bun.write(htmlPath, fixedHtml);
}

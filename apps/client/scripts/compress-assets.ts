import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TARGET_DIR = "apps/client/public";
const SOURCE_DIR = "apps/client/src";

async function getFiles(dir: string): Promise<string[]> {
	const dirents = await fs.readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		dirents.map((dirent) => {
			const res = path.resolve(dir, dirent.name);
			return dirent.isDirectory() ? getFiles(res) : res;
		}),
	);
	return Array.isArray(files) ? files.flat() : [];
}

async function updateReferences(
	oldName: string,
	newName: string,
	rootDir: string,
) {
	const files = await getFiles(rootDir);
	const sourceFiles = files.filter((f) => /\.(tsx|ts|css|scss)$/.test(f));

	let count = 0;
	for (const file of sourceFiles) {
		const content = await fs.readFile(file, "utf-8");
		// Simple replace of the filename
		// We look for the filename in quotes or url() to be somewhat safe,
		// but simple string replacement is usually effective for unique asset names.
		// We'll be slightly aggressive but log changes.
		if (content.includes(oldName)) {
			const newContent = content.replaceAll(oldName, newName);
			await fs.writeFile(file, newContent);
			count++;
		}
	}
	return count;
}

async function compressAssets() {
	console.log("🚀 Starting asset compression...");

	const allFiles = await getFiles(TARGET_DIR);
	const imageFiles = allFiles.filter((file) =>
		/\.(png|jpg|jpeg|webp)$/i.test(file),
	);

	console.log(`Found ${imageFiles.length} images to process.`);

	let savedBytes = 0;

	for (const file of imageFiles) {
		const ext = path.extname(file);
		const filename = path.basename(file);
		const dir = path.dirname(file);
		const nameWithoutExt = path.basename(file, ext);
		const newFilename = `${nameWithoutExt}.webp`;
		const newFilePath = path.join(dir, newFilename);

		// If input is webp, we will overwrite it with the resized version
		// If input is other, we create new webp and delete old

		try {
			const originalStats = await fs.stat(file);
			const originalSize = originalStats.size;

			// If it's already a webp and we are just resizing, we need a temp file or handle overwrite carefuly
			// Sharp can't write to same file it reads from.
			const isWebP = ext.toLowerCase() === ".webp";
			const tempFilePath = isWebP
				? path.join(dir, `${nameWithoutExt}_temp.webp`)
				: newFilePath;

			await sharp(file)
				.resize({ width: 2048, withoutEnlargement: true }) // Max width 2K
				.webp({ quality: 80, effort: 6 }) // effort 6 = slower but better compression
				.toFile(tempFilePath);

			if (isWebP) {
				await fs.rename(tempFilePath, file);
			}

			const finalPath = isWebP ? file : newFilePath;
			const newStats = await fs.stat(finalPath);
			const newSize = newStats.size;
			const savings = originalSize - newSize;
			savedBytes += savings;

			console.log(`✅ Processed: ${filename} -> ${path.basename(finalPath)}`);
			console.log(
				`   Size: ${(originalSize / 1024).toFixed(2)}KB -> ${(newSize / 1024).toFixed(2)}KB (${((1 - newSize / originalSize) * 100).toFixed(1)}% saved)`,
			);

			// Update references in source code if name changed
			if (!isWebP) {
				const updatedRefs = await updateReferences(
					filename,
					newFilename,
					SOURCE_DIR,
				);
				if (updatedRefs > 0) {
					console.log(
						`   Updated ${updatedRefs} files referencing this image.`,
					);
				}
				// Delete original file
				await fs.unlink(file);
			}
		} catch (error) {
			console.error(`❌ Failed to process ${filename}:`, error);
		}
	}

	console.log("------------------------------------------------");
	console.log(`🎉 Compression complete!`);
	console.log(
		`💾 Total space saved: ${(savedBytes / 1024 / 1024).toFixed(2)} MB`,
	);
}

compressAssets().catch(console.error);

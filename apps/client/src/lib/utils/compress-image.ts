import imageCompression from "browser-image-compression";

export async function compressPng(file: File, lossless = false): Promise<File> {
	const options = {
		maxWidthOrHeight: 300,
		useWebWorker: true,
		fileType: lossless ? "image/png" : "image/webp",
		initialQuality: lossless ? 1.0 : 0.8,
	};

	return imageCompression(file, options);
}

export const compressionPresets = {
	signature: { maxWidthOrHeight: 300, quality: 0.8, format: "webp" },
	avatar: { maxWidthOrHeight: 200, quality: 0.9, format: "webp" },
	thumbnail: { maxWidthOrHeight: 150, quality: 0.7, format: "webp" },
	lossless: { maxWidthOrHeight: 300, quality: 1.0, format: "png" },
} as const;

import { useMutation } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import { normalizeApiBaseUrl } from "../../orpc/create-orpc-client";
import { useAuthedApi } from "../auth";

const avatarOk = z.object({
	success: z.literal(true),
	data: z.object({
		avatarKey: z.string(),
		message: z.string().optional(),
	}),
	message: z.string().optional(),
});

export function useUpdateUserAvatar() {
	const { data: auth } = useAuthedApi();
	const { apiBaseUrl } = useFilosignContext();

	return useMutation({
		mutationFn: async (args: { avatar: File }) => {
			if (!auth) throw new Error("Not reachable");

			if (!args.avatar.type.startsWith("image/")) {
				throw new Error("File must be an image");
			}
			const compressedFile = await imageCompression(args.avatar, {
				maxSizeMB: 32 / 1024,
				fileType: "image/webp",
				useWebWorker: true,
			});

			const formData = new FormData();
			formData.append("avatar", compressedFile);

			const url = `${normalizeApiBaseUrl(apiBaseUrl)}/api/users/profile/avatar`;
			const authorization = auth.session.getAuthorizationValue();
			if (!authorization) {
				throw new Error("Not authenticated");
			}

			const response = await fetch(url, {
				method: "PUT",
				headers: { Authorization: authorization },
				body: formData,
			});

			const bodyUnknown: unknown = await response.json().catch(() => null);
			const parsed = avatarOk.safeParse(bodyUnknown);
			if (!response.ok || !parsed.success) {
				throw new Error("Avatar upload failed");
			}
			return parsed.data.data;
		},
	});
}

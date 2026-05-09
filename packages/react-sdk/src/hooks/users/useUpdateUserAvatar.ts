import { useMutation } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import z from "zod";
import { useAuthedApi } from "../auth";

export function useUpdateUserAvatar() {
	const { data: api } = useAuthedApi();

	return useMutation({
		mutationFn: async (args: { avatar: File }) => {
			if (!api) throw new Error("Not reachable");

			if (!args.avatar.type.startsWith("image/")) {
				throw new Error("File must be an image");
			}
			const compressedFile = await imageCompression(args.avatar, {
				maxSizeMB: 32 / 1024, // 32KB
				fileType: "image/webp",
				useWebWorker: true,
			});

			const formData = new FormData();
			formData.append("avatar", compressedFile);

			const response = await api.rpc.putSafe(
				{
					avatarKey: z.string(),
				},
				`/users/profile/avatar`,
				formData,
			);

			return response.data;
		},
	});
}

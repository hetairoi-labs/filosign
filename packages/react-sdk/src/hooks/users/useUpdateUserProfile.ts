import { useMutation, useQueryClient } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { useAuthedApi } from "../auth";

type ProfileTextFields = {
	email?: string;
	username?: string;
	firstName?: string;
	lastName?: string;
};

export function useUpdateUserProfile() {
	const { data: auth } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: ProfileTextFields & { avatar?: File }) => {
			if (!auth) throw new Error("Not reachable");

			const { avatar, ...rest } = args;

			const payload: Record<string, unknown> = {};
			if (rest.email !== undefined) payload.email = rest.email;
			if (rest.username !== undefined) payload.username = rest.username;
			if (rest.firstName !== undefined) payload.firstName = rest.firstName;
			if (rest.lastName !== undefined) payload.lastName = rest.lastName;

			if (avatar) {
				if (!avatar.type.startsWith("image/")) {
					throw new Error("Avatar must be an image");
				}
				const compressed = await imageCompression(avatar, {
					maxSizeMB: 32 / 1024,
					fileType: "image/webp",
					useWebWorker: true,
				});

				const { uploadUrl, key } = await auth.rpc.storage.presignPut({
					kind: "webp_user_avatar",
				});

				const putRes = await fetch(uploadUrl, {
					method: "PUT",
					headers: {
						"Content-Type": "image/webp",
					},
					body: compressed,
				});

				if (!putRes.ok) {
					throw new Error(`Avatar upload failed (${putRes.status})`);
				}

				payload.avatarKey = key;
			}

			if (Object.keys(payload).length === 0) {
				return;
			}

			await auth.rpc.users.profile.update(payload);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user"] });
		},
	});
}

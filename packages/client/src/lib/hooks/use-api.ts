import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import client from "../utils/api-client";

export function useApi() {
	const queryClient = useQueryClient();

	return {
		// Get all waitlist emails
		getWaitlistEmails: useQuery({
			queryKey: ["waitlist"],
			queryFn: async () => {
				const result = await client.waitlist.index.$get();
				const parsed = await result.json();

				if (!parsed.success) {
					throw new Error(parsed.error);
				}

				return parsed.data;
			},
		}),

		// Join waitlist
		joinWaitlist: useMutation({
			mutationFn: async (email: string) => {
				const result = await client.waitlist.index.$post({
					json: {
						email,
					},
				});

				const parsed = await result.json();

				if (!parsed.success) {
					throw new Error(parsed.error);
				}

				return parsed.data;
			},
			onSuccess: (_res) => {
				toast.success("Successfully joined the waitlist!");
				// Invalidate waitlist queries to refresh data
				queryClient.invalidateQueries({ queryKey: ["waitlist"] });
			},
			onError: (err) => {
				console.error(err);
				toast.error(err.message || "Failed to join waitlist");
			},
		}),

		// Remove email from waitlist
		removeFromWaitlist: useMutation({
			mutationFn: async (email: string) => {
				const result = await client.waitlist[":email"].$delete({
					param: { email },
				});

				const parsed = await result.json();

				if (!parsed.success) {
					throw new Error(parsed.error);
				}

				return parsed.data;
			},
			onSuccess: (_res) => {
				toast.success("Successfully removed from waitlist!");
				// Invalidate waitlist queries to refresh data
				queryClient.invalidateQueries({ queryKey: ["waitlist"] });
			},
			onError: (err) => {
				console.error(err);
				toast.error(err.message || "Failed to remove from waitlist");
			},
		}),
	};
}

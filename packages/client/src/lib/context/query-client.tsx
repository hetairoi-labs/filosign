import {
	QueryClient,
	QueryClientProvider as QueryClientProviderBase,
} from "@tanstack/react-query";
import { toast } from "sonner";

const onError = (error: unknown) => toast(String(error));

if (import.meta.hot) {
	if (!import.meta.hot.data.queryClient) {
		import.meta.hot.data.queryClient = new QueryClient({
			defaultOptions: { mutations: { onError } },
		});
	}
}

export const queryClient: QueryClient = import.meta.hot
	? (import.meta.hot.data.queryClient as QueryClient)
	: new QueryClient({ defaultOptions: { mutations: { onError } } });

export function QueryClientProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<QueryClientProviderBase client={queryClient}>
			{children}
		</QueryClientProviderBase>
	);
}

import { PostHogProvider } from "@posthog/react";
import type { ReactNode } from "react";
import {
	AnalyticsContextProvider,
	useNoopAnalytics,
	usePostHogAnalyticsBridge,
} from "./context";

export type FilosignAnalyticsProviderProps = {
	children: ReactNode;
	apiKey: string;
	apiHost: string;
	enabled: boolean;
};

function PostHogAnalyticsBridge({ children }: { children: ReactNode }) {
	const analytics = usePostHogAnalyticsBridge();
	return (
		<AnalyticsContextProvider value={analytics}>
			{children}
		</AnalyticsContextProvider>
	);
}

/** Mount in the app shell (e.g. `apps/client` `main.tsx`). Requires `@posthog/react` + `posthog-js`. */
export function FilosignAnalyticsProvider({
	children,
	apiKey,
	apiHost,
	enabled,
}: FilosignAnalyticsProviderProps) {
	const noop = useNoopAnalytics();

	if (!enabled || !apiKey) {
		return (
			<AnalyticsContextProvider value={noop}>
				{children}
			</AnalyticsContextProvider>
		);
	}

	return (
		<PostHogProvider
			apiKey={apiKey}
			options={{
				api_host: apiHost,
				autocapture: false,
				capture_pageview: false,
				capture_pageleave: false,
				disable_session_recording: true,
				persistence: "localStorage",
			}}
		>
			<PostHogAnalyticsBridge>{children}</PostHogAnalyticsBridge>
		</PostHogProvider>
	);
}

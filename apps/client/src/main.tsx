import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import ProfileEmailSync from "./lib/components/custom/ProfileEmailSync";
import { ErrorBoundary } from "./lib/components/errors/ErrorBoundary";
import { QueryClientProvider } from "./lib/context/query-client";
import { ThemeProvider } from "./lib/context/theme-provider";
import router from "./router";
import "./globals.css";
import { IconContext } from "@phosphor-icons/react";
import { Buffer as BufferI } from "buffer";
import { FilosignProvider } from "./lib/context/filosign-provider";
import { PrivyProvider } from "./lib/context/privy-provider";
import { WagmiProvider } from "./lib/context/wagmi-provider";

// Root element
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// App
const App = () => {
	return (
		<StrictMode>
			<ErrorBoundary>
				<ThemeProvider defaultTheme="light" storageKey="theme">
					<QueryClientProvider>
						<PrivyProvider>
							<WagmiProvider>
								<FilosignProvider>
									<IconContext.Provider
										value={{
											mirrored: false,
											weight: "regular",
										}}
									>
										<ProfileEmailSync />
										<RouterProvider router={router} />
										<Toaster position="bottom-right" />
									</IconContext.Provider>
								</FilosignProvider>
							</WagmiProvider>
						</PrivyProvider>
					</QueryClientProvider>
				</ThemeProvider>
			</ErrorBoundary>
		</StrictMode>
	);
};

window.Buffer = window.Buffer || BufferI;

if (!("toJSON" in BigInt.prototype)) {
	Object.defineProperty(BigInt.prototype, "toJSON", {
		value() {
			return this.toString();
		},
		configurable: true,
		writable: true,
	});
}

createRoot(rootElement).render(<App />);

import { FilosignProvider as FilosignProviderBase } from "@filosign/react";
import { useEffect, useState } from "react";
import { useWalletClient } from "wagmi";
import { Loader } from "../components/ui/loader";
import { logger } from "../utils/logger";
import env from "@/src/env";

type DilithiumModule = {
	generateKeys?: unknown;
};

export function FilosignProvider({ children }: { children: React.ReactNode }) {
	const { data: wallet } = useWalletClient();

	const [dilithium, setDilithium] = useState<DilithiumModule | undefined>(
		undefined,
	);

	useEffect(() => {
		let mounted = true;

		async function init() {
			try {
				// Mock chrome for the dilithium library
				(
					globalThis as { chrome?: { runtime: { getURL: () => string } } }
				).chrome = {
					runtime: {
						getURL: () => "/dilithium.wasm",
					},
				};

				const module = await import(
					"dilithium-crystals-js/dist/dilithium.min.js"
				);
				let dil: DilithiumModule | undefined;
				if (typeof module === "function") {
					dil = await (module as () => Promise<DilithiumModule>)();
				}
				//  else if (module.default && typeof module.default === "function") {
				//     dil = await module.default();
				// }
				else if (
					module.createDilithium &&
					typeof module.createDilithium === "function"
				) {
					dil = await module.createDilithium();
				} else {
					dil = module;
				}

				if (!mounted) return;
				setDilithium(dil as DilithiumModule);
			} catch (err) {
				logger.error("Failed to init Dilithium:", err);
			}
		}

		init();
		return () => {
			mounted = false;
		};
	}, []);

	if (!dilithium?.generateKeys) {
		return <Loader />;
	}

	return (
		<FilosignProviderBase
			apiBaseUrl={env.VITE_PLATFORM_URL}
			wasm={{
				dilithium: dilithium as never,
			}}
			wallet={wallet}
			loader={Loader}
		>
			{children}
		</FilosignProviderBase>
	);
}

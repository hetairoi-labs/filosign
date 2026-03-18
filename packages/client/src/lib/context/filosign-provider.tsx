/** biome-ignore-all lint/suspicious/noExplicitAny: <explanationn nahi haih bhai koi explanation, chutia libry hai>  */
import { FilosignProvider as FilosignProviderBase } from "@filosign/react";
import { useEffect, useState } from "react";
import { useWalletClient } from "wagmi";
import { Loader } from "../components/ui/loader";

export function FilosignProvider({ children }: { children: React.ReactNode }) {
	const { data: wallet } = useWalletClient();
	const [dilithium, setDilithium] = useState<any>(null);

	useEffect(() => {
		let mounted = true;

		async function init() {
			try {
				// Mock chrome for the dilithium library
				(globalThis as any).chrome = {
					runtime: { getURL: () => "/static/dilithium.wasm" },
				};

				const module = await import(
					"dilithium-crystals-js/dist/dilithium.min.js"
				);
				let dil: any = null;
				if (typeof module === "function") {
					dil = await (module as any)();
				} else if (
					module.createDilithium &&
					typeof module.createDilithium === "function"
				) {
					dil = await module.createDilithium();
				} else {
					dil = module;
				}

				if (!mounted) return;
				setDilithium(dil);
			} catch (err: any) {
				console.error("Failed to init Dilithium:", err);
			}
		}

		init();
		return () => { mounted = false; };
	}, []);

	return (
		<FilosignProviderBase
			apiBaseUrl={process.env.BUN_PUBLIC_PLATFORM_URL || "localhost:30011"}
			wasm={{ dilithium }}
			wallet={wallet}
			loader={Loader}
		>
			{!!dilithium?.generateKeys && children}
		</FilosignProviderBase>
	);
}

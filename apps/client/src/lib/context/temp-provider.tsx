import { createConfig, http } from "wagmi";
import { filecoinCalibration } from "wagmi/chains";

export const config = createConfig({
	chains: [filecoinCalibration],
	transports: {
		[filecoinCalibration.id]: http(),
	},
});

import { useContext } from "react";
import { FilosignContext } from "./FilosignContext";

export function useFilosignContext() {
	return useContext(FilosignContext);
}

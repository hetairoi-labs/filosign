import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

//@ts-expect-error
BigInt.prototype.toJSON = function () {
	return this.toString();
};

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

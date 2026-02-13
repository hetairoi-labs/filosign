import { useState } from "react";

export default function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="card">
			<button type="button" onClick={() => setCount((count) => count + 1)}>
				count is {count}
			</button>
			<p>
				Edit <code>src/App.tsx</code> and save to test HMR
			</p>
		</div>
	);
}

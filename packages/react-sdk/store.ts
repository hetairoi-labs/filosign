import { noop } from "./types/utils";

type StoreType<T = string> = {
	get: (key: string) => T | null;
	set: (key: string, value: Awaited<T>) => void;
	delete: (key: string) => void;
};

const emptyStore = {
	get: () => null,
	set: noop,
	delete: noop,
};

export class FilosignStore {
	private _persistent: StoreType = emptyStore;
	private _global: StoreType = emptyStore;
	private _cache: StoreType<Promise<string>> = emptyStore;

	get persistent() {
		if (this._persistent.get.toString() === noop.toString()) {
			this._persistent = {
				get: window.localStorage.getItem.bind(window.localStorage),
				set: window.localStorage.setItem.bind(window.localStorage),
				delete: window.localStorage.removeItem.bind(window.localStorage),
			};
		}
		return this._persistent;
	}

	set persistent(v) {
		this._persistent = v;
	}

	get global() {
		if (this._global.get.toString() === noop.toString()) {
			this._global = {
				get: window.sessionStorage.getItem.bind(window.sessionStorage),
				set: window.sessionStorage.setItem.bind(window.sessionStorage),
				delete: window.sessionStorage.removeItem.bind(window.sessionStorage),
			};
		}
		return this._global;
	}

	get cache() {
		return this._cache;
	}

	set cache(v) {
		this._cache = v;
	}

	// constructor(options: {}) {}
}

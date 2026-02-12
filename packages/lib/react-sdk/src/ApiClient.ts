import axios, { type AxiosInstance } from "axios";
import { type ZodRawShape, type ZodType, z } from "zod";

export default class ApiClient {
	private _client: ExtendedAxios;
	private _authHeader: { Authorization: `Bearer ${string}` };
	private _baseUrl: string;

	constructor(baseUrl: string) {
		this._baseUrl = baseUrl;
		this._authHeader = { Authorization: "Bearer null" };
		this._client = this.createClient();
	}

	private createClient() {
		const instance = axios.create({
			baseURL: this._baseUrl,
			timeout: 30_000,
			headers: {
				Authorization: this._authHeader.Authorization,
			},
		});
		return new ExtendedAxios(instance);
	}

	public ensureJwt() {
		if (!this.jwtExists) {
			throw new Error("JWT token is missing - user is not logged in");
		}
	}

	get jwtExists() {
		return this._authHeader.Authorization !== "Bearer null";
	}

	get rpc() {
		return this._client;
	}

	setJwt(authToken: string | null) {
		if (authToken === null || authToken === undefined) {
			this._authHeader = { Authorization: "Bearer null" };
		} else {
			this._authHeader = { Authorization: `Bearer ${authToken}` };
		}
		this._client = this.createClient();
	}
}

class ExtendedAxios {
	private axios: AxiosInstance;

	constructor(baseAxios: AxiosInstance) {
		this.axios = baseAxios;
	}

	get base() {
		return this.axios;
	}

	private getApiResponseZodType<T>(zodType: ZodType<T>) {
		return z
			.object({
				success: z.literal(true),
				data: zodType,
				message: z.string(),
			})
			.or(
				z.object({
					success: z.literal(false),
					error: z.string(),
				}),
			);
	}

	async tx(txHash: string, data: Record<string, unknown>) {
		const res = await this.axios.post(`/tx/${txHash}`, data);
		if (!res.data.success) {
			console.error("Transaction API error:", res.data);
		}
		return res.status === 201;
	}

	async getSafe<T extends ZodRawShape>(
		zResponseShape: T,
		...args: Parameters<AxiosInstance["get"]>
	) {
		const resp = await this.axios.get(...args);
		const parsed = this.getApiResponseZodType(z.object(zResponseShape)).parse(
			resp.data,
		);
		if (!parsed.success) {
			throw new Error(parsed.error || "API returned an error");
		}
		return { ...parsed, statusCode: resp.status };
	}

	async postSafe<T extends ZodRawShape>(
		zResponseShape: T,
		...args: Parameters<AxiosInstance["post"]>
	) {
		const resp = await this.axios.post(...args);
		const parsed = this.getApiResponseZodType(z.object(zResponseShape)).parse(
			resp.data,
		);
		if (!parsed.success) {
			throw new Error(parsed.error || "API returned an error");
		}
		return { ...parsed, statusCode: resp.status };
	}

	async putSafe<T extends ZodRawShape>(
		zResponseShape: T,
		...args: Parameters<AxiosInstance["put"]>
	) {
		const resp = await this.axios.put(...args);
		const parsed = this.getApiResponseZodType(z.object(zResponseShape)).parse(
			resp.data,
		);
		if (!parsed.success) {
			throw new Error(parsed.error || "API returned an error");
		}
		return { ...parsed, statusCode: resp.status };
	}

	async deleteSafe<T extends ZodRawShape>(
		zResponseShape: T,
		...args: Parameters<AxiosInstance["delete"]>
	) {
		const resp = await this.axios.delete(...args);
		const parsed = this.getApiResponseZodType(z.object(zResponseShape)).parse(
			resp.data,
		);
		if (!parsed.success) {
			throw new Error(parsed.error || "API returned an error");
		}
		return { ...parsed, statusCode: resp.status };
	}
}

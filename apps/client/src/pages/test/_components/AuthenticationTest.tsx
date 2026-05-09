import {
	useIsLoggedIn,
	useIsRegistered,
	useLogin,
	useLogout,
	useStoredKeygenData,
} from "@filosign/react/hooks";
import {
	CheckCircleIcon,
	KeyIcon,
	SpinnerIcon,
	UserIcon,
	XIcon,
} from "@phosphor-icons/react";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../../../lib/components/ui/card";

export function AuthenticationTest() {
	const { user, login: loginPrivy, logout: logoutPrivy } = usePrivy();
	const queryClient = useQueryClient();

	const login = useLogin();
	const logout = useLogout();
	const isRegistered = useIsRegistered();
	const isLoggedIn = useIsLoggedIn();
	const storedKeygenData = useStoredKeygenData();

	async function handleRegisterFilosign() {
		try {
			await login.mutateAsync({ pin: "111111" });
			await queryClient.invalidateQueries({
				queryKey: ["filosign", "isRegistered"],
			});
			console.log("register", login.isSuccess, login.isError);

			// Force page refresh after successful registration
			window.location.reload();
		} catch (error) {
			console.error("Failed to register", error);
		}
	}

	async function handleLoginFilosign() {
		try {
			await login.mutateAsync({ pin: "111111" });
			// Invalidate isLoggedIn query to refetch with new JWT
			await queryClient.invalidateQueries({
				queryKey: ["filosign", "isLoggedIn"],
			});
			console.log("login", login.isSuccess, login.isError);
		} catch (error) {
			console.error("Failed to login", error);
		}
	}

	async function handleLogoutFilosign() {
		try {
			await logout.mutateAsync(undefined);
			console.log("logout", logout.isSuccess, logout.isError);
		} catch (error) {
			console.error("Failed to logout", error);
		}
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-6 md:grid-cols-2">
				{/* Privy Authentication */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserIcon className="w-5 h-5" />
							Privy Authentication
						</CardTitle>
						<CardDescription>
							Connect and disconnect your wallet
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex gap-3">
							{!user ? (
								<Button
									onClick={() => loginPrivy()}
									className="flex-1"
									size="lg"
								>
									<UserIcon className="w-4 h-4 mr-2" />
									Login with Privy
								</Button>
							) : (
								<Button
									onClick={() => logoutPrivy()}
									variant="outline"
									className="flex-1"
									size="lg"
								>
									<XIcon className="w-4 h-4 mr-2" />
									Logout from Privy
								</Button>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Filosign Authentication */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<KeyIcon className="w-5 h-5" />
							Filosign Authentication
						</CardTitle>
						<CardDescription>
							Register and authenticate with Filosign
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							{!isRegistered.data && (
								<Button
									onClick={handleRegisterFilosign}
									disabled={login.isPending}
									className="w-full"
									size="lg"
								>
									{login.isPending ? (
										<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
									) : (
										<CheckCircleIcon className="w-4 h-4 mr-2" />
									)}
									Register with Filosign
								</Button>
							)}

							{!isLoggedIn.data && isRegistered.data && (
								<Button
									onClick={handleLoginFilosign}
									disabled={login.isPending}
									className="w-full"
									size="lg"
								>
									{login.isPending ? (
										<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
									) : (
										<KeyIcon className="w-4 h-4 mr-2" />
									)}
									Login to Filosign
								</Button>
							)}

							{isLoggedIn.data && (
								<Button
									onClick={handleLogoutFilosign}
									disabled={logout.isPending}
									variant="outline"
									className="w-full"
									size="lg"
								>
									{logout.isPending ? (
										<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
									) : (
										<XIcon className="w-4 h-4 mr-2" />
									)}
									Logout from Filosign
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Keygen Data Display */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<KeyIcon className="w-5 h-5" />
						Stored Keygen Data
					</CardTitle>
					<CardDescription>
						Current cryptographic key data stored for this wallet
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="bg-muted/50 p-4 rounded-lg">
						{storedKeygenData.isLoading ? (
							<div className="flex items-center gap-2 text-muted-foreground">
								<SpinnerIcon className="w-4 h-4 animate-spin" />
								Loading keygen data...
							</div>
						) : storedKeygenData.error ? (
							<div className="text-red-600">
								Error loading keygen data: {storedKeygenData.error.message}
							</div>
						) : storedKeygenData.data ? (
							<pre className="text-xs whitespace-pre-wrap">
								{JSON.stringify(storedKeygenData.data, null, 2)}
							</pre>
						) : (
							<div className="text-muted-foreground">
								No keygen data found. Register with Filosign to generate
								cryptographic keys.
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

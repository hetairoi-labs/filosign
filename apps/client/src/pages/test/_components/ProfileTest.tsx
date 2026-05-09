import { useUserProfileByQuery } from "@filosign/react/hooks";
import { EyeIcon, SpinnerIcon, UserIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "../../../lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../../../lib/components/ui/card";
import { Input } from "../../../lib/components/ui/input";
import { Label } from "../../../lib/components/ui/label";

export function ProfileTest() {
	const [profileAddress, setProfileAddress] = useState("");

	const profile = useUserProfileByQuery({
		address: profileAddress as `0x${string}`,
	});

	const handleGetProfile = () => {
		if (!profileAddress.trim()) return;
		profile.refetch();
	};

	return (
		<div className="space-y-6">
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Get User Profile */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<EyeIcon className="w-5 h-5" />
							Get User Profile
						</CardTitle>
						<CardDescription>
							Fetch user profile information by wallet address
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<Label htmlFor="profile-address">Wallet Address</Label>
								<Input
									id="profile-address"
									placeholder="0x..."
									value={profileAddress}
									onChange={(e) => setProfileAddress(e.target.value)}
								/>
							</div>
							<Button
								onClick={handleGetProfile}
								disabled={!profileAddress.trim() || profile.isFetching}
								className="w-full"
								size="lg"
							>
								{profile.isFetching ? (
									<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<EyeIcon className="w-4 h-4 mr-2" />
								)}
								Get Profile
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Profile Information Display */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserIcon className="w-5 h-5" />
							Profile Information
						</CardTitle>
						<CardDescription>
							User profile data and encryption keys
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="bg-muted/50 p-4 rounded-lg">
							{profile.isLoading ? (
								<div className="flex items-center gap-2 text-muted-foreground">
									<SpinnerIcon className="w-4 h-4 animate-spin" />
									Loading profile...
								</div>
							) : profile.error ? (
								<div className="text-red-600">
									Error loading profile: {profile.error.message}
								</div>
							) : profile.data ? (
								<pre className="text-xs whitespace-pre-wrap">
									{JSON.stringify(profile.data, null, 2)}
								</pre>
							) : (
								<div className="text-muted-foreground">
									Enter a wallet address and click "Get Profile" to fetch user
									information
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

import ConnectButton from "@/src/lib/components/custom/ConnectButton";
import Logo from "@/src/lib/components/custom/Logo";

export default function SignInPage() {
	return (
		<div className="min-h-dvh bg-background flex flex-col items-center justify-center p-8">
			<div className="w-full max-w-sm flex flex-col items-center gap-10">
				<Logo redirectTo="/" className="px-0" textDelay={0} iconDelay={0} />
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-medium font-manrope text-foreground tracking-tight">
						Welcome back
					</h1>
					<p className="text-sm text-muted-foreground">
						Sign in to continue to Filosign
					</p>
				</div>
				<div className="flex justify-center">
					<ConnectButton />
				</div>
			</div>
		</div>
	);
}

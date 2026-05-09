import { OverviewSlide } from "./_components/01.5-overview-slide";
import { IntroSlide } from "./_components/01-intro-slide";
import { ProblemSlide } from "./_components/02-problem-slide";
import { SolutionSlide } from "./_components/03-solution-slide";
import { HowItWorksSlide } from "./_components/04-how-it-works-slide";
import { EncryptionSlide } from "./_components/05.1-encryption-slide";
import { FlowSlide } from "./_components/05.2-flow-slide";
import { SecuritySlide } from "./_components/05-security-slide";
import { GoToMarketSlide } from "./_components/06-go-to-market-slide";
import { CtaSlide } from "./_components/07-cta-slide";

export default function PitchPage() {
	return (
		<div className="h-screen overflow-y-scroll snap-y snap-mandatory bg-background">
			<IntroSlide />
			<OverviewSlide />
			<ProblemSlide />
			<SolutionSlide />
			<HowItWorksSlide />
			<SecuritySlide />
			<FlowSlide />
			<EncryptionSlide />
			<GoToMarketSlide />
			<CtaSlide />
		</div>
	);
}

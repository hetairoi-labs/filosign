import FooterSection from "../landing/footer-section";
import LandingNavbar from "../landing/landing-nav";
import ComparisonSection from "./comparison-section";
import PricingHero from "./pricing-hero";
import PricingSection from "./pricing-section";

function PricingPage() {
	return (
		<div className="min-h-screen bg-background font-manrope selection:bg-primary/10 selection:text-primary">
			<LandingNavbar />
			<main>
				<PricingHero />
				<PricingSection />
				<ComparisonSection />
			</main>
			<FooterSection />
		</div>
	);
}

export default PricingPage;

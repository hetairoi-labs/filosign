import FooterSection from "../landing/footer-section";
import LandingNavbar from "../landing/landing-nav";
import AboutHero from "./about-hero";
import QuoteSection from "./quote-section";
import ValuesSection from "./values-section";

function AboutPage() {
	return (
		<div className="min-h-screen bg-background font-manrope selection:bg-primary/10 selection:text-primary">
			<LandingNavbar />
			<main>
				<AboutHero />
				<QuoteSection />
				<ValuesSection />
			</main>
			<FooterSection />
		</div>
	);
}

export default AboutPage;

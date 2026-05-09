import FooterSection from "../landing/footer-section";
import LandingNavbar from "../landing/landing-nav";
import ChangelogHero from "./changelog-hero";
import ChangelogList from "./changelog-list";

function ChangelogPage() {
	return (
		<div className="min-h-screen bg-background font-manrope selection:bg-primary/10 selection:text-primary">
			<LandingNavbar />
			<main>
				<ChangelogHero />
				<ChangelogList />
			</main>
			<FooterSection />
		</div>
	);
}

export default ChangelogPage;

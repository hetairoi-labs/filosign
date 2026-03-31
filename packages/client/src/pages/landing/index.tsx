import BentoGridSection from "./bento-grid-section";
import FeaturesBento from "./features-bento";
import FooterSection from "./footer-section";
import HeroSection from "./hero-section";
import LandingNavbar from "./landing-nav";
// import TestimonialSection from "./testimonial-section";
// import TrustedCompanies from "./trusted-companies";
// import WaitlistNewSection from "./waitlist-new";

export default function LandingPage() {
	return (
		<div className="[--section-gap:4rem]">
			<LandingNavbar />
			<div className="h-[var(--section-gap)]" />
			<HeroSection />
			<FeaturesBento />
			<BentoGridSection />
			{/* <WaitlistNewSection /> */}
			<div className="h-[var(--section-gap)]" />
			<FooterSection />
		</div>
	);
}

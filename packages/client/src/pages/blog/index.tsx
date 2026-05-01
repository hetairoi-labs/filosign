import FooterSection from "../landing/footer-section";
import LandingNavbar from "../landing/landing-nav";
import BlogHero from "./blog-hero";

function BlogPage() {
	return (
		<div className="min-h-screen bg-background font-manrope selection:bg-primary/10 selection:text-primary">
			<LandingNavbar />
			<main>
				<BlogHero />
				{/* <EditorsPicks /> */}
				{/* <RecentlyPublished /> */}
			</main>
			<FooterSection />
		</div>
	);
}

export default BlogPage;

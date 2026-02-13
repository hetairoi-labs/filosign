import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
} from "@tanstack/react-router";
import { withPageErrorBoundary } from "@/src/lib/components/errors/PageErrorBoundary";
import DashboardProtector from "../lib/components/custom/DashboardProtector";
import { NotFound } from "../lib/components/custom/NotFound";
import AboutPage from "./about";
import BlogPage from "./blog";
import BlogPostPage from "./blog/post";
import ChangelogPage from "./changelog";
import ConnectionsPage from "./dashboard/connections";
import DocumentAllPage from "./dashboard/document/all";
import SignDocumentPage from "./dashboard/document/sign";
import AddSignaturePage from "./dashboard/envelope/create/add-sign";
import CreateEnvelopePage from "./dashboard/envelope/create/create";
import FilesPage from "./dashboard/files";
import PermissionsPage from "./dashboard/permissions";
import ProfilePage from "./dashboard/profile";
import CreateNewSignaturePage from "./dashboard/signature/create";
import LandingPage from "./landing";
import LogoPage from "./logo";
import OnboardingWelcomePage from "./onboarding";
import OnboardingCreateSignaturePage from "./onboarding/create-signature";
import OnboardingSetPinPage from "./onboarding/set-pin";
import OnboardingWelcomeCompletePage from "./onboarding/welcome";
import PitchPage from "./pitch";
import PricingPage from "./pricing";
import TestPage from "./test";

const rootRoute = createRootRoute({
	component: () => <Outlet />,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: function Index() {
		return withPageErrorBoundary(LandingPage)({});
	},
});

const aboutRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/about",
	component: function About() {
		return withPageErrorBoundary(AboutPage)({});
	},
});

const pricingRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/pricing",
	component: function Pricing() {
		return withPageErrorBoundary(PricingPage)({});
	},
});

const blogRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/blog",
	component: function Blog() {
		return withPageErrorBoundary(BlogPage)({});
	},
});

const blogPostRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/blog/$postId",
	component: function BlogPost() {
		return withPageErrorBoundary(BlogPostPage)({});
	},
});

const changelogRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/changelog",
	component: function Changelog() {
		return withPageErrorBoundary(ChangelogPage)({});
	},
});

const pitchRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/pitch",
	component: function Pitch() {
		return withPageErrorBoundary(PitchPage)({});
	},
});

const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard",
	component: function Dashboard() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(DocumentAllPage)({})}
			</DashboardProtector>
		);
	},
});

const profileRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/settings/profile",
	component: function Profile() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(ProfilePage)({})}
			</DashboardProtector>
		);
	},
});

const permissionsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/settings/permissions",
	component: function Permissions() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(PermissionsPage)({})}
			</DashboardProtector>
		);
	},
});

const connectionsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/connections",
	component: function Connections() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(ConnectionsPage)({})}
			</DashboardProtector>
		);
	},
});

const dashboardDocumentAllRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/document/all",
	component: function DocumentAll() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(DocumentAllPage)({})}
			</DashboardProtector>
		);
	},
});

const signDocumentRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/document/sign",
	validateSearch: (search: Record<string, unknown>) => {
		return {
			pieceCid: (search.pieceCid as string) || "",
		} as { pieceCid: string };
	},
	component: function SignDocument() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(SignDocumentPage)({})}
			</DashboardProtector>
		);
	},
});

const createSignatureRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/signature/create",
	component: function CreateSignature() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(CreateNewSignaturePage)({})}
			</DashboardProtector>
		);
	},
});

const createEnvelopeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/envelope/create",
	component: function Create() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(CreateEnvelopePage)({})}
			</DashboardProtector>
		);
	},
});

const addSignatureRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/envelope/create/add-sign",
	component: function AddSignature() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(AddSignaturePage)({})}
			</DashboardProtector>
		);
	},
});

const allDocsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/files",
	component: function Files() {
		return (
			<DashboardProtector>
				{withPageErrorBoundary(FilesPage)({})}
			</DashboardProtector>
		);
	},
});

// Onboarding Routes
const onboardingWelcomeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding",
	component: function OnboardingWelcome() {
		return withPageErrorBoundary(OnboardingWelcomePage)({});
	},
});

const onboardingSetPinRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding/set-pin",
	component: function OnboardingSetPin() {
		return withPageErrorBoundary(OnboardingSetPinPage)({});
	},
});

const onboardingCreateSignatureRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding/create-signature",
	component: function OnboardingCreateSignature() {
		return withPageErrorBoundary(OnboardingCreateSignaturePage)({});
	},
});

const onboardingWelcomeCompleteRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding/welcome",
	component: function OnboardingWelcomeComplete() {
		return withPageErrorBoundary(OnboardingWelcomeCompletePage)({});
	},
});

const notFoundRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "$",
	component: function NotFoundPage() {
		return <NotFound />;
	},
});

const testRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/test",
	component: function Test() {
		return withPageErrorBoundary(TestPage)({});
	},
});

const logoRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/logo",
	component: function Logo() {
		return withPageErrorBoundary(LogoPage)({});
	},
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	aboutRoute,
	pricingRoute,
	blogRoute,
	blogPostRoute,
	changelogRoute,
	pitchRoute,
	dashboardRoute,
	profileRoute,
	permissionsRoute,
	connectionsRoute,
	dashboardDocumentAllRoute,
	signDocumentRoute,
	createEnvelopeRoute,
	addSignatureRoute,
	createSignatureRoute,
	allDocsRoute,
	onboardingWelcomeRoute,
	onboardingSetPinRoute,
	onboardingCreateSignatureRoute,
	onboardingWelcomeCompleteRoute,
	notFoundRoute,
	testRoute,
	logoRoute,
]);
const router = createRouter({
	routeTree,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export default router;

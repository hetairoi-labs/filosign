import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
} from "@tanstack/react-router";
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
import InvitePage from "./invite";
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
	component: LandingPage,
});

const aboutRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/about",
	component: AboutPage,
});

const pricingRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/pricing",
	component: PricingPage,
});

const blogRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/blog",
	component: BlogPage,
});

const blogPostRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/blog/$postId",
	component: BlogPostPage,
});

const changelogRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/changelog",
	component: ChangelogPage,
});

const pitchRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/pitch",
	component: PitchPage,
});

const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard",
	component: function Dashboard() {
		return (
			<DashboardProtector>
				<DocumentAllPage />
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
				<ProfilePage />
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
				<PermissionsPage />
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
				<ConnectionsPage />
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
				<DocumentAllPage />
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
				<SignDocumentPage />
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
				<CreateNewSignaturePage />
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
				<CreateEnvelopePage />
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
				<AddSignaturePage />
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
				<FilesPage />
			</DashboardProtector>
		);
	},
});

// Onboarding Routes
const onboardingWelcomeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding",
	component: OnboardingWelcomePage,
});

const onboardingSetPinRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding/set-pin",
	component: OnboardingSetPinPage,
});

const onboardingCreateSignatureRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding/create-signature",
	component: OnboardingCreateSignaturePage,
});

const onboardingWelcomeCompleteRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding/welcome",
	component: OnboardingWelcomeCompletePage,
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
	component: TestPage,
});

const logoRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/logo",
	component: LogoPage,
});

const inviteRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/invite/$inviteId",
	component: InvitePage,
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
	inviteRoute,
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

import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
} from "@tanstack/react-router";
import { type ComponentType, lazy, Suspense } from "react";
import { withPageErrorBoundary } from "@/src/lib/components/errors/PageErrorBoundary";
import DashboardProtector from "../lib/components/custom/DashboardProtector";
import { NotFound } from "../lib/components/custom/NotFound";

const LandingPage = lazy(() => import("./landing"));
const AboutPage = lazy(() => import("./about"));
const PricingPage = lazy(() => import("./pricing"));
const BlogPage = lazy(() => import("./blog"));
const BlogPostPage = lazy(() => import("./blog/post"));
const ChangelogPage = lazy(() => import("./changelog"));
const PitchPage = lazy(() => import("./pitch"));
const DocumentAllPage = lazy(() => import("./dashboard/document/all"));
const ProfilePage = lazy(() => import("./dashboard/profile"));
const PermissionsPage = lazy(() => import("./dashboard/permissions"));
const ConnectionsPage = lazy(() => import("./dashboard/connections"));
const SignDocumentPage = lazy(() => import("./dashboard/document/sign"));
const CreateEnvelopePage = lazy(
	() => import("./dashboard/envelope/create/create"),
);
const AddSignaturePage = lazy(
	() => import("./dashboard/envelope/create/add-sign"),
);
const CreateNewSignaturePage = lazy(
	() => import("./dashboard/signature/create"),
);
const FilesPage = lazy(() => import("./dashboard/files"));
const OnboardingWelcomePage = lazy(() => import("./onboarding"));
const OnboardingSetPinPage = lazy(() => import("./onboarding/set-pin"));
const OnboardingCreateSignaturePage = lazy(
	() => import("./onboarding/create-signature"),
);
const OnboardingWelcomeCompletePage = lazy(
	() => import("./onboarding/welcome"),
);
const TestPage = lazy(() => import("./test"));
const LogoPage = lazy(() => import("./logo"));
const InvitePage = lazy(() => import("./invite"));

function PageFallback() {
	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<div className="text-sm text-muted-foreground">Loading…</div>
		</div>
	);
}

function suspensePage(Component: ComponentType) {
	const Wrapped = () => (
		<Suspense fallback={<PageFallback />}>
			<Component />
		</Suspense>
	);
	return withPageErrorBoundary(Wrapped)({});
}

const rootRoute = createRootRoute({
	component: () => <Outlet />,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: function Index() {
		return suspensePage(LandingPage);
	},
});

const aboutRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/about",
	component: function About() {
		return suspensePage(AboutPage);
	},
});

const pricingRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/pricing",
	component: function Pricing() {
		return suspensePage(PricingPage);
	},
});

const blogRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/blog",
	component: function Blog() {
		return suspensePage(BlogPage);
	},
});

const blogPostRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/blog/$postId",
	component: function BlogPost() {
		return suspensePage(BlogPostPage);
	},
});

const changelogRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/changelog",
	component: function Changelog() {
		return suspensePage(ChangelogPage);
	},
});

const pitchRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/pitch",
	component: function Pitch() {
		return suspensePage(PitchPage);
	},
});

const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard",
	component: function Dashboard() {
		return (
			<DashboardProtector>{suspensePage(DocumentAllPage)}</DashboardProtector>
		);
	},
});

const profileRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/settings/profile",
	component: function Profile() {
		return <DashboardProtector>{suspensePage(ProfilePage)}</DashboardProtector>;
	},
});

const permissionsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/settings/permissions",
	component: function Permissions() {
		return (
			<DashboardProtector>{suspensePage(PermissionsPage)}</DashboardProtector>
		);
	},
});

const connectionsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/connections",
	component: function Connections() {
		return (
			<DashboardProtector>{suspensePage(ConnectionsPage)}</DashboardProtector>
		);
	},
});

const dashboardDocumentAllRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/document/all",
	component: function DocumentAll() {
		return (
			<DashboardProtector>{suspensePage(DocumentAllPage)}</DashboardProtector>
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
			<DashboardProtector>{suspensePage(SignDocumentPage)}</DashboardProtector>
		);
	},
});

const createSignatureRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/signature/create",
	component: function CreateSignature() {
		return (
			<DashboardProtector>
				{suspensePage(CreateNewSignaturePage)}
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
				{suspensePage(CreateEnvelopePage)}
			</DashboardProtector>
		);
	},
});

const addSignatureRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/envelope/create/add-sign",
	component: function AddSignature() {
		return (
			<DashboardProtector>{suspensePage(AddSignaturePage)}</DashboardProtector>
		);
	},
});

const allDocsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard/files",
	component: function Files() {
		return <DashboardProtector>{suspensePage(FilesPage)}</DashboardProtector>;
	},
});

// Onboarding Routes
const onboardingWelcomeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding",
	component: function OnboardingWelcome() {
		return suspensePage(OnboardingWelcomePage);
	},
});

const onboardingSetPinRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding/set-pin",
	component: function OnboardingSetPin() {
		return suspensePage(OnboardingSetPinPage);
	},
});

const onboardingCreateSignatureRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding/create-signature",
	component: function OnboardingCreateSignature() {
		return suspensePage(OnboardingCreateSignaturePage);
	},
});

const onboardingWelcomeCompleteRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding/welcome",
	component: function OnboardingWelcomeComplete() {
		return suspensePage(OnboardingWelcomeCompletePage);
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
		return suspensePage(TestPage);
	},
});

const logoRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/logo",
	component: function Logo() {
		return suspensePage(LogoPage);
	},
});

const inviteRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/invite/$inviteId",
	component: function Invite() {
		return suspensePage(InvitePage);
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

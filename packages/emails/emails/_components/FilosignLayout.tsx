import {
	Body,
	Button,
	Column,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Preview,
	Row,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { filosignEmailAssets } from "../../src/astro-assets";
import { FilosignFonts } from "../_theme/filosign-fonts";
import { filosignTailwindConfig } from "../_theme/filosign-tailwind";
import { FilosignFooter } from "./FilosignFooter";

export type FilosignLayoutProps = {
	title: string;
	preheader: string;
	ctaHref: string;
	ctaLabel: string;
	children: ReactNode;
	disclaimer?: ReactNode;
};

export function FilosignLayout({
	title,
	preheader,
	ctaHref,
	ctaLabel,
	children,
	disclaimer,
}: FilosignLayoutProps) {
	return (
		<Tailwind config={filosignTailwindConfig}>
			<Html lang="en">
				<Head>
					<meta name="color-scheme" content="light" />
					<FilosignFonts />
				</Head>
				<Body className="bg-bg-2 m-0 text-center font-sans">
					<Preview>{preheader}</Preview>
					<Container className="mobile:mt-0 mx-auto mt-8 w-full max-w-[640px]">
						<Section>
							<Section className="bg-bg mobile:px-2 px-6 py-4">
								<Section className="mb-3 px-6">
									<Row>
										<Column className="w-1/2 py-[7px] align-middle">
											<Row>
												<Column className="w-[32px] align-middle">
													<Img
														src={filosignEmailAssets.logo}
														alt="Filosign"
														width={23}
														height={23}
														className="block"
													/>
												</Column>
											</Row>
										</Column>
										<Column
											align="right"
											className="w-1/2 py-[7px] align-middle"
										>
											<Text className="font-13 m-0 text-right font-sans">
												<span className="text-fg-3">Filosign</span>
											</Text>
										</Column>
									</Row>
								</Section>

								<Section className="bg-bg-2 mobile:px-6 mobile:py-12 rounded-[8px] px-[40px] py-[64px] text-center">
									<Section className="mb-3">
										<Img
											src={filosignEmailAssets.logo}
											alt="Filosign"
											width={48}
											height={48}
											className="mx-auto mb-5 block"
										/>
										<Heading as="h1" className="font-28 text-fg m-0 font-sans">
											{title}
										</Heading>
									</Section>

									{children}

									<Section className="mb-6 text-center">
										<Button
											href={ctaHref}
											className="bg-fg font-16 text-fg-inverted inline-block rounded-lg px-7 py-4 text-center font-sans leading-6"
										>
											{ctaLabel}
										</Button>
									</Section>

									{disclaimer ? (
										<Text className="font-13 text-fg-3 mx-auto mt-8 mb-0 max-w-[400px] text-center font-sans">
											{disclaimer}
										</Text>
									) : null}
								</Section>

								<FilosignFooter />
							</Section>
						</Section>
					</Container>
				</Body>
			</Html>
		</Tailwind>
	);
}

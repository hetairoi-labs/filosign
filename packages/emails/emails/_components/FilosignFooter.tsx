import { Column, Img, Link, Row, Section, Text } from "@react-email/components";
import { filosignEmailAssets } from "../../src/astro-assets";
import {
	FILOSIGN_FOOTER_LINKS,
	FILOSIGN_FOOTER_TAGLINE,
} from "../../src/constants";

const footerChannels = [
	{ key: "email" as const, ...FILOSIGN_FOOTER_LINKS.email },
	{ key: "x" as const, ...FILOSIGN_FOOTER_LINKS.x },
	{ key: "website" as const, ...FILOSIGN_FOOTER_LINKS.website },
] as const;

export function FilosignFooter() {
	return (
		<Section className="bg-bg">
			<Row>
				<Column className="px-6 py-10 text-center">
					<Text className="font-13 text-fg-3 mx-auto mt-0 mb-8 max-w-[320px] text-center font-sans">
						{FILOSIGN_FOOTER_TAGLINE}
					</Text>

					<Section className="mb-8">
						<Row>
							{footerChannels.map((channel) => (
								<Column
									key={channel.key}
									align="center"
									className="w-1/3 align-top"
								>
									<Link
										href={channel.href}
										className="inline-block no-underline"
									>
										<Img
											src={filosignEmailAssets.icons[channel.key]}
											alt=""
											width={18}
											height={18}
											className="mx-auto mb-2 block"
										/>
										<Text className="font-13 text-fg-3 m-0 font-sans">
											{channel.label}
										</Text>
									</Link>
								</Column>
							))}
						</Row>
					</Section>

					<Text className="font-11 text-fg-3 mx-auto mt-0 mb-0 max-w-[400px] text-center font-sans">
						This message was sent by Filosign because someone used your email
						address in the product. If you did not expect it, you can ignore
						this email.
					</Text>
				</Column>
			</Row>
		</Section>
	);
}

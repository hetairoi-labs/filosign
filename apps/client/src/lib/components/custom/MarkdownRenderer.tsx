import type { Components, ExtraProps } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { cn } from "@/src/lib/utils";

type ComponentProps<T extends keyof React.JSX.IntrinsicElements> =
	React.JSX.IntrinsicElements[T] & ExtraProps;

interface MarkdownRendererProps {
	content: string;
	className?: string;
}

export default function MarkdownRenderer({
	content,
	className,
}: MarkdownRendererProps) {
	const components: Components = {
		// Customize code blocks
		code({
			node,
			inline,
			className,
			children,
			...props
		}: ComponentProps<"code"> & { inline?: boolean }) {
			const match = /language-(\w+)/.exec(className || "");
			return !inline && match ? (
				<div className="my-8 rounded-xl overflow-hidden border border-border/50 shadow-sm">
					<div className="bg-muted/30 px-4 py-2 border-b border-border/50 flex items-center gap-2">
						<div className="flex gap-1.5">
							<div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
							<div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
							<div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
						</div>
						<span className="text-xs font-medium text-muted-foreground ml-2 font-mono">
							{match[1]}
						</span>
					</div>
					<SyntaxHighlighter
						style={oneLight}
						language={match[1]}
						PreTag="div"
						className="!bg-white/50 !p-4 !m-0 text-sm font-mono"
						customStyle={{
							margin: 0,
							background: "transparent",
						}}
					>
						{String(children).replace(/\n$/, "")}
					</SyntaxHighlighter>
				</div>
			) : (
				<code
					className="bg-muted/50 px-1.5 py-0.5 rounded-md text-sm font-mono text-foreground"
					{...props}
				>
					{children}
				</code>
			);
		},
		// Customize links
		a({ children, href, ...props }: ComponentProps<"a">) {
			return (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="text-foreground border-b border-foreground/30 hover:border-foreground transition-colors pb-0.5 font-medium"
					{...props}
				>
					{children}
				</a>
			);
		},
		// Customize blockquotes
		blockquote({ children, ...props }: ComponentProps<"blockquote">) {
			return (
				<blockquote
					className="my-8 pl-6 border-l-2 border-primary italic text-xl text-foreground/80 font-manrope leading-relaxed"
					{...props}
				>
					{children}
				</blockquote>
			);
		},
		// Customize tables
		table({ children, ...props }: ComponentProps<"table">) {
			return (
				<div className="my-8 overflow-hidden rounded-xl border border-border/50 shadow-sm">
					<table className="w-full text-sm text-left" {...props}>
						{children}
					</table>
				</div>
			);
		},
		th({ children, ...props }: ComponentProps<"th">) {
			return (
				<th
					className="bg-muted/30 px-6 py-4 font-semibold text-foreground border-b border-border/50 first:pl-8"
					{...props}
				>
					{children}
				</th>
			);
		},
		td({ children, ...props }: ComponentProps<"td">) {
			return (
				<td
					className="px-6 py-4 text-muted-foreground border-b border-border/50 last:border-0 first:pl-8"
					{...props}
				>
					{children}
				</td>
			);
		},
		// Customize lists
		ul({ children, ...props }: ComponentProps<"ul">) {
			return (
				<ul
					className="list-disc list-outside ml-6 my-6 space-y-2 marker:text-muted-foreground"
					{...props}
				>
					{children}
				</ul>
			);
		},
		ol({ children, ...props }: ComponentProps<"ol">) {
			return (
				<ol
					className="list-decimal list-outside ml-6 my-6 space-y-2 marker:text-muted-foreground marker:font-medium"
					{...props}
				>
					{children}
				</ol>
			);
		},
		// Customize headings
		h1({ children, ...props }: ComponentProps<"h1">) {
			return (
				<h1
					className="text-4xl font-medium mt-12 mb-6 tracking-tight text-foreground font-inter"
					{...props}
				>
					{children}
				</h1>
			);
		},
		h2({ children, ...props }: ComponentProps<"h2">) {
			return (
				<h2
					className="text-3xl font-medium mt-16 mb-6 tracking-tight text-foreground font-inter"
					{...props}
				>
					{children}
				</h2>
			);
		},
		h3({ children, ...props }: ComponentProps<"h3">) {
			return (
				<h3
					className="text-2xl font-medium mt-12 mb-4 tracking-tight text-foreground font-inter"
					{...props}
				>
					{children}
				</h3>
			);
		},
		// Customize paragraphs
		p({ children, ...props }: ComponentProps<"p">) {
			return (
				<p
					className="text-lg leading-relaxed text-muted-foreground mb-6 font-manrope"
					{...props}
				>
					{children}
				</p>
			);
		},
	};

	return (
		<div className={cn("max-w-none", className)}>
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
				{content}
			</ReactMarkdown>
		</div>
	);
}

import nextra from "nextra";
import remarkBreaks from "remark-breaks";
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert";
import { remarkCustomAlerts } from "./remark-custom-alerts.mjs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Routes for Obsidian-managed directories that are gitignored (exist locally, not in CI)
const OBSIDIAN_ROUTE_PREFIXES = ["/.obsidian", "/.trash", "/assets"];

function filterObsidianPages(pageMap) {
	return pageMap
		.filter(
			(item) =>
				!item.route ||
				!OBSIDIAN_ROUTE_PREFIXES.some(
					(prefix) =>
						item.route === prefix || item.route.startsWith(prefix + "/")
				)
		)
		.map((item) => {
			// Normalize name to NFD so that Nextra's strict === comparison against
			// _meta.js keys (which macOS stores as NFD) succeeds on Linux CI
			// where fs.readdir returns NFC-normalized Unicode filenames.
			const normalized = item.name ? { ...item, name: item.name.normalize("NFD") } : item;
			return normalized.children
				? { ...normalized, children: filterObsidianPages(normalized.children) }
				: normalized;
		});
}

const withNextra = nextra({
	theme: "nextra-theme-docs",
	themeConfig: "./theme.config.jsx",
	mdxOptions: {
		remarkPlugins: [remarkBreaks, remarkGithubBlockquoteAlert, remarkCustomAlerts],
		//rehypePlugins: [rehypeRaw],
		rehypePrettyCodeOptions: {
			theme: {
				dark: 'one-dark-pro',
				light: 'one-light'
			}
		}
	},
	// Filter out Obsidian-managed directories from the page map so they don't
	// appear in sidebar navigation or cause rendering errors locally.
	transformPageMap: filterObsidianPages,
});

const nextConfig = {
	images: {
		unoptimized: true,
	},
	output: "export",   // github.io에 배포할 때는 이 line 주석 해제
	reactStrictMode: false,
	webpack(config, { webpack }) {
		// Replace Obsidian plugin files with an empty React component stub so that
		// Next.js can compile and statically export them without errors.
		// Only affects local builds; .obsidian is gitignored so it does not exist in CI.
		// Stub out Obsidian-managed directories that exist locally but are gitignored in CI:
		// pages/.obsidian, pages/.trash, pages/assets
		config.plugins.push(
			new webpack.NormalModuleReplacementPlugin(
				/pages[/\\](\.[^/\\]+|assets)[/\\]/,
				resolve(__dirname, "_obsidian_stub.js")
			)
		);
		return config;
	},
};

export default withNextra(nextConfig);

//module.exports = {
//	...withNextra(),
//	...nextConfig,
//};
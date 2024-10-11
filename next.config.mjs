import nextra from "nextra";
import remarkBreaks from "remark-breaks";

const withNextra = nextra({
	theme: "nextra-theme-docs",
	themeConfig: "./theme.config.jsx",
	mdxOptions: {
		remarkPlugins: [remarkBreaks],
		//rehypePlugins: [rehypeRaw],
		rehypePrettyCodeOptions: {
			theme: {
				dark: 'one-dark-pro',
				light: 'one-light'
			}
		}
	},
});

const nextConfig = {
	images: {
		unoptimized: true,
	},
	output: "export",
	reactStrictMode: false,
};

export default withNextra(nextConfig);

//module.exports = {
//	...withNextra(),
//	...nextConfig,
//};
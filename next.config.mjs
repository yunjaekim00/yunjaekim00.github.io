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
	output: "export",   // github.io에 배포할 때는 이 line 주석 해제
	reactStrictMode: false,
};

export default withNextra(nextConfig);

//module.exports = {
//	...withNextra(),
//	...nextConfig,
//};
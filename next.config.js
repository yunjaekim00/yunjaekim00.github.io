const withNextra = require("nextra")({
	theme: "nextra-theme-docs",
	themeConfig: "./theme.config.jsx",
});

const nextConfig = {
	images: {
		unoptimized: true,
	},
	reactStrictMode: false,
}

module.exports = {
	...withNextra(),
	...nextConfig,
};

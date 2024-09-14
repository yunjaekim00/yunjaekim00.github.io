const path = require("path");

const withNextra = require("nextra")({
	theme: "nextra-theme-docs",
	themeConfig: "./theme.config.jsx",
});

const nextConfig = {
	images: {
		unoptimized: true,
	},
	reactStrictMode: false,
};

//const excludeBuild = {
//	webpack: (config) => {
//		config.module.rules.push({
//			test: /\.md$/,
//			use: 'null-loader', // Ignore Markdown files
//		});

//		config.module.rules.push({
//			test: /\.js$/,
//			include: [
//				path.resolve(__dirname, `/.obsidian`), // Move .obsidian outside of pages/
//				path.resolve(__dirname, `/assets`), // Move assets outside of pages/
//			],
//			use: 'null-loader', // Ignore files inside src/obsidian and src/assets/templates
//		});

//		return config;
//	},
//};

module.exports = {
	...withNextra(),
	...nextConfig,
	//...excludeBuild,
};

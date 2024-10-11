import "../styles/globals.css";
//import { ThemeProvider } from "next-themes";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import Script from "next/script";
import Head from "next/head";

function MyApp({ Component, pageProps }) {
	const { theme, setTheme } = useTheme();
	useEffect(() => {
		setTheme("light");
		// Initialize Google Analytics
		window.dataLayer = window.dataLayer || [];
		function gtag() {
			window.dataLayer.push(arguments);
		}
		gtag("js", new Date());
		gtag("config", "G-2Q3CM48GRW"); // Replace with your GA tracking ID
	}, []);
	return (
		<>
			<Script
				strategy="afterInteractive"
				src="https://www.googletagmanager.com/gtag/js?id=G-2Q3CM48GRW"
			/>
			<Script id="google-analytics" strategy="afterInteractive">
				{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-2Q3CM48GRW');
        `}
			</Script>

			{/* Comic Neue Font */}
			<Head>
				<link
					href="https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap"
					rel="stylesheet"
				/>
			</Head>
			{/* Umami Analytics Script */}
			<Script
				src="https://cloud.umami.is/script.js"
				data-website-id="acd1907e-3e2b-470d-bda6-8bd7b31819d6"
				strategy="lazyOnload"
			/>
			{/*<!-- Google tag (gtag.js) -->*/}

			{/*<ThemeProvider defaultTheme='light'>*/}
			<Component {...pageProps} />
			{/*</ThemeProvider>*/}
		</>
	);
}

export default MyApp;

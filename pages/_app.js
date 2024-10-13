import "../styles/globals.css";
//import { ThemeProvider } from "next-themes";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import Script from "next/script";

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
			{/*<!-- Google tag (gtag.js) -->*/}
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

			{/*<ThemeProvider>*/}
			<Component {...pageProps} />
			{/*</ThemeProvider>*/}
		</>
	);
}

export default MyApp;

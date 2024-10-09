import "../styles/globals.css";
import Script from "next/script";
//import { ThemeProvider } from "next-themes";
import { useTheme } from "next-themes";
import { useEffect } from "react";

function MyApp({ Component, pageProps }) {
	const { theme, setTheme } = useTheme();
	useEffect(() => {
		setTheme("light");
	}, []);
	return (
		<>
			<link
				href="https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap"
				rel="stylesheet"
			/>

			{/* Umami Analytics Script */}
			<Script
				src="https://cloud.umami.is/script.js"
				data-website-id="acd1907e-3e2b-470d-bda6-8bd7b31819d6"
				strategy="lazyOnload"
			/>

			{/*<ThemeProvider defaultTheme='light'>*/}
			<Component {...pageProps} />
			{/*</ThemeProvider>*/}
		</>
	);
}

export default MyApp;

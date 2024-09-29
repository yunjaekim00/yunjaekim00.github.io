import "../styles/globals.css";
import Script from "next/script";

function MyApp({ Component, pageProps }) {
	return (
		<>
			{/* Umami Analytics Script */}
			<Script
				src="https://cloud.umami.is/script.js"
				data-website-id="acd1907e-3e2b-470d-bda6-8bd7b31819d6"
				strategy="lazyOnload"
			/>
			<Component {...pageProps} />
		</>
	);
}

export default MyApp;

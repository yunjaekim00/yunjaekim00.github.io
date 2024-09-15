//import '../styles/globals.css';
import Script from 'next/script';  // Import Script from Next.js

function MyApp({ Component, pageProps }) {
	return (
		<>
			{/* Umami Analytics Script */}
			<Script
				src="https://cloud.umami.is/script.js"
				data-website-id="acd1907e-3e2b-470d-bda6-8bd7b31819d6"
				strategy="lazyOnload"
			/>
			{/* Your application */}
			<Component {...pageProps} />
		</>
	);
}

export default MyApp;
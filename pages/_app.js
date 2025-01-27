import "../styles/globals.css";
//import { ThemeProvider } from "next-themes";
import { useTheme } from "next-themes";
import { useEffect } from "react";

function MyApp({ Component, pageProps, content }) {
	const { theme, setTheme } = useTheme();
	useEffect(() => {
		setTheme("light");
	}, []);
	return (
		<>
			{/*<ThemeProvider>*/}
			<Component {...pageProps} />
			{/*</ThemeProvider>*/}
		</>
	);
}



export default MyApp;

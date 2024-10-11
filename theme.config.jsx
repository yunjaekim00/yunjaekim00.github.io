import { useConfig } from "nextra-theme-docs";
import Image from "next/image";
import logo from "@/public/logo.svg";

export default {
  head: (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap"
        rel="stylesheet"
      />
    </>
  ),
  logo: <Image src={logo} alt="my logo" width={160} />,
  //logo: <span>YJK's blog</span>,
  feedback: {
    content: null,
  },

  //themeSwitch: {
  //  useOptions() {
  //    return {
  //      light: "Light",
  //      dark: "Dark",
  //      system: "System",
  //    };
  //  },
  //},
  editLink: {
    component: null,
  },
  footer: {
    component: null,
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    autoCollapse: true,
    toggleButton: false,
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s – YJK's blog",
    };
  },

  navigation: false,
  gitTimestamp: () => {
    const { frontMatter } = useConfig();
    return (
      <div>
        {/* 한 줄 띄기 */}
        Last updated on: {frontMatter.date}
      </div>
    );
  },
};

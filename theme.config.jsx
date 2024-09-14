import { useConfig } from "nextra-theme-docs";
import Image from "next/image";
//import logo from "./public/logo.svg";
import logo from "@/public/logo.svg";

export default {
  logo: <Image src={logo} alt="my logo" width={160} />,
  //logo: <span>YJK's blog</span>,
  //project: {
  //  link: "https://github.com/shuding/nextra",
  //},
  // ... other theme options
  feedback: {
    content: null,
  },
  editLink: {
    component: null,
  },
  footer: {
    component: null,
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

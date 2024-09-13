//import { useConfig } from "nextra-theme-docs";

export default {
  logo: <span>YJK's blog</span>,
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

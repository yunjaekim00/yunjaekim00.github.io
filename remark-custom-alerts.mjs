import { visit } from "unist-util-visit";

const CUSTOM_TYPES = {
  summary: "M2 2.5A2.5 2.5 0 0 1 4.5 0h7.78a.75.75 0 0 1 .53.22l2.72 2.72a.75.75 0 0 1 .22.53V13.5a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 2 13.5Zm2.5-1a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6h-1.75A1.75 1.75 0 0 1 10 4.25V2.5Zm3.75 8.25a.75.75 0 0 1 0 1.5H5.75a.75.75 0 0 1 0-1.5Zm0-3a.75.75 0 0 1 0 1.5H5.75a.75.75 0 0 1 0-1.5Zm1.5-5.94V4.25c0 .138.112.25.25.25H11.5Z",
  quote: "M6.3.2A.73.73 0 0 1 7 .75v4.5A.75.75 0 0 1 6.25 6H2v3.25A.75.75 0 0 1 1.25 10 .75.75 0 0 1 .5 9.25V5.5A5.5 5.5 0 0 1 6 0a.75.75 0 0 1 .3.2Zm7.5 0A.73.73 0 0 1 14.5.75v4.5A.75.75 0 0 1 13.75 6H9.5v3.25a.75.75 0 0 1-1.5 0V5.5A5.5 5.5 0 0 1 13.5 0a.75.75 0 0 1 .3.2Z",
};

const customAlertRegex = /^\[!(SUMMARY|QUOTE)\]/i;

function makeIcon(type) {
  return {
    type: "emphasis",
    data: {
      hName: "svg",
      hProperties: {
        className: ["octicon"],
        viewBox: "0 0 16 16",
        width: "16",
        height: "16",
        ariaHidden: "true",
      },
    },
    children: [
      {
        type: "emphasis",
        data: {
          hName: "path",
          hProperties: { d: CUSTOM_TYPES[type] ?? "" },
        },
        children: [],
      },
    ],
  };
}

export function remarkCustomAlerts() {
  return (tree) => {
    visit(tree, "blockquote", (node) => {
      let alertType = "";
      let title = "";
      let isNext = true;

      const child = node.children.map((item) => {
        if (isNext && item.type === "paragraph") {
          const firstNode = item.children[0];
          const text = firstNode.type === "text" ? firstNode.value : "";
          const match = text.match(customAlertRegex);
          if (match) {
            isNext = false;
            alertType = match[1].toLowerCase();
            title = match[1].toUpperCase();
            const itemChild = [];
            item.children.forEach((child, idx) => {
              if (idx === 0) return;
              if (idx === 1 && child.type === "break") return;
              itemChild.push(child);
            });
            item.children = itemChild;
          }
        }
        return item;
      });

      if (alertType) {
        node.data = {
          hName: "div",
          hProperties: {
            className: ["markdown-alert", `markdown-alert-${alertType}`],
            dir: "auto",
          },
        };
        child.unshift({
          type: "paragraph",
          children: [makeIcon(alertType), { type: "text", value: title }],
          data: {
            hProperties: { className: "markdown-alert-title", dir: "auto" },
          },
        });
      }

      node.children = child;
    });
  };
}

export default remarkCustomAlerts;

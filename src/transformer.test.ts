import { transformer } from "./transformer";

import { applyTransform } from "jscodeshift/src/testUtils";

function transformArgs(input: string): Parameters<typeof applyTransform> {
  return [transformer, {}, { source: input }, { parser: "tsx" }];
}

describe("transformer", () => {
  it("works (kitchen sink)", () => {
    const input = `
const themeContract = createThemeContract({ color: "red" });
const theme1 = createTheme(themeContract, { color: "red" });
const theme2 = createTheme(themeContract, { color: "blue" });
const normalStyle1 = style({ color: "red" });
const normalStyle2 = style({ color: "red" });
const normalStyleCombined = style([normalStyle1, normalStyle2]);
const styleWithThemeRef = style({ color: theme.color });
const styleWithSelectors = style({ selectors: {
  "&:hover": {
    color: "red"
  },
}});
const styleWithMedia = style({
  color: theme.color,
  background: "blue",
  "@media": {
    "(min-width: 1024px)": {
      color: "red"
    }
  },
});
    `;
    expect(applyTransform(...transformArgs(input))).toMatchInlineSnapshot(`
      ".themeContract {
        --color: red;
      }

      .theme1 {
        --color: red;
      }

      .theme2 {
        --color: blue;
      }

      .normalStyle1 {
        color: red;
      }

      .normalStyle2 {
        color: red;
      }

      .normalStyleCombined {
      }

      .styleWithThemeRef {
        color: var(--color);
      }

      .styleWithSelectors {
      }
      .styleWithSelectors:hover {color: red;}

      .styleWithMedia {
        color: var(--color);
        background: blue;
      }"
    `);
  });

  it("handles static rules", () => {
    const input = `
    export const one = style({
      color: "red",
      fontSize: "12px",
    });`;

    expect(applyTransform(...transformArgs(input))).toMatchInlineSnapshot(`
      ".one {
        color: red;
        font-size: 12px;
      }"
    `);
  });

  it("handles theme contracts", () => {
    const input = `
    export const themeContract = createThemeContract({ 
      color: "red",
      fontSize: "12px"
     });
    
    export const one = style({
      background: themeContract.color,
    });

    export const two = style({
      fontSize: themeContract.fontSize,
    });`;

    expect(applyTransform(...transformArgs(input))).toMatchInlineSnapshot(`
      ".themeContract {
        --color: red;
        --font-size: 12px;
      }

      .one {
        background: var(--color);
      }

      .two {
        font-size: var(--font-size);
      }"
    `);
  });

  it("handles selectors", () => {
    const input = `
    const styleWithSelectors = style({ 
      color: "red",
      fontSize: "12px",
      selectors: {
        "&:hover": {
          color: "red"
        },
        "nav li > &": {
          textDecoration: 'underline'
        },
        "&:active": {
          color: "blue"
        }
      }
    });`;

    expect(applyTransform(...transformArgs(input))).toMatchInlineSnapshot(`
      ".styleWithSelectors {
        color: red;
        font-size: 12px;
      }
      .styleWithSelectors:hover {color: red;}
      nav li > .styleWithSelectors {textDecoration: underline;}
      .styleWithSelectors:active {color: blue;}"
    `);
  });
});

import { transformer } from "./transformer";

import { applyTransform } from "jscodeshift/src/testUtils";

function transformArgs(input: string): Parameters<typeof applyTransform> {
  return [transformer, {}, { source: input }, { parser: "ts" }];
}

describe("transformer", () => {
  it("works (kitchen sink)", () => {
    const input = `
const themeContract = createThemeContract({ color: "" });
const theme1 = createTheme(themeContract, { color: "red" });
const theme2 = createTheme(themeContract, { color: "blue" });
const normalStyle = style({ color: "red" });
const styleWithThemeRef = style({ color: theme.color });
const styleWithSelectors = style({ selectors: {
  "&:hover": {
    color: "red"
  },
}});
const styleWithMedia = style({
  "@media": {
    "(min-width: 1024px)": {
      color: "red"
    }
  },
});
    `;
    expect(applyTransform(...transformArgs(input))).toMatchInlineSnapshot(`
".themeContract {
  color: ;
}

.theme1 {
  color: red;
}

.theme2 {
  color: blue;
}

.normalStyle {
  color: red;
}

.styleWithThemeRef {
  color: undefined;
}

.styleWithSelectors {
  selectors: undefined;
  : undefined;
  color: red;
}

.styleWithMedia {
  : undefined;
  color: red;
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
});

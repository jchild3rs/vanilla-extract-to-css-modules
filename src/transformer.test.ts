import { transformer } from "./transformer";

import { applyTransform } from "jscodeshift/src/testUtils";

describe("transformer", () => {
  it("handles static rules", () => {
    const input = `
    export const one = style({
      color: "red",
      fontSize: "12px",
    });`;

    const actual = applyTransform(
      transformer,
      {},
      { source: input },
      { parser: "ts" }
    );

    expect(actual).toMatchInlineSnapshot(`
".one {
  color: red;
  font-size: 12px;
}"
`);
  });
});

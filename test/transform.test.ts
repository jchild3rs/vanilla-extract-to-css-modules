import { runTest } from "./test-utils";

describe('transform', () => {
  describe("basic values", () => {
    runTest("basic");
  });

  describe("special number values", () => {
    runTest("number-values");
  });

  describe("with global theme vars", () => {
    runTest("global-theme-vars");
  });

  describe("handles selectors", () => {
    runTest("selectors");
  });

  describe("handles media queries", () => {
    runTest("media");
  });
})

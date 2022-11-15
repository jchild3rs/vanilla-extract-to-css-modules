import { defineTest } from "jscodeshift/dist/testUtils";

jest.autoMockOff();

export function runTest(fixtureName: string, options = { dry: true }) {
  defineTest(__dirname, "./src/index", options, fixtureName, {
    parser: "ts",
  });
}

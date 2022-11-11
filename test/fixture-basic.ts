import { style } from "@vanilla-extract/css";
import { vars } from "./fixture-vars";

export const one = style({
  color: vars.someColor,
  fontSize: "12px",
});

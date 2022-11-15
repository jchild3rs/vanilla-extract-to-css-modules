const styleWithSelectors = style({
  color: "red",
  fontSize: "12px",
  selectors: {
    "&:hover": {
      color: "red",
      margin: `${vars.space['2x']} ${vars.space['4x']}`,
    },
    "nav li > &": {
      textDecoration: 'underline'
    },
    "&:active": {
      color: "blue"
    }
  }
});

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
});

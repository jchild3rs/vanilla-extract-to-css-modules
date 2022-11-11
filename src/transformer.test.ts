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

      .styleWithSelectors:hover {
        color: red;
      }

      .styleWithMedia {
        color: var(--color);
        background: blue;
      }

      @media (min-width: 1024px) {
        .styleWithMedia {
          color: red;
        }
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

      .styleWithSelectors:hover {
        color: red;
      }

      nav li > .styleWithSelectors {
        text-decoration: underline;
      }

      .styleWithSelectors:active {
        color: blue;
      }"
    `);
  });

  it("handles number values", () => {
    const input = `
    const styleWithSelectors = style({ 
      width: 300,
      lineHeight: 1.5
    });`;

    expect(applyTransform(...transformArgs(input))).toMatchInlineSnapshot(`
      ".styleWithSelectors {
        width: 300px;
        line-height: 1.5;
      }"
    `);
  });

  it("handles media queries", () => {
    const input = `
    const styleWithSelectors = style({ 
      '@media': {
        'screen and (min-width: 768px)': {
          padding: 10
        },
        '(prefers-reduced-motion)': {
          transitionProperty: 'color'
        }
      }
    });`;

    expect(applyTransform(...transformArgs(input))).toMatchInlineSnapshot(`
      ".styleWithSelectors {
      }

      @media screen and (min-width: 768px) {
        .styleWithSelectors {
          padding: 10px;
        }
      }
      @media (prefers-reduced-motion) {
        .styleWithSelectors {
          transition-property: color;
        }
      }"
    `);
  });

  it("handles vars", () => {
    const input = `import { breakpoints } from '@brand/styles/breakpoints'
import { createThemeContract, style } from '@vanilla-extract/css'

import { vars } from '../../styles/vars.css'

export const pageHeaderContract = createThemeContract({
  background: '',
  text: '',
  height: '',
  borderBottom: '',
  back: {
    color: '',
    backgroundColor: '',
    backgroundColorActive: '',
  },
  links: {
    backgroundColor: '',
    color: '',
    colorHover: '',
    colorActive: '',
    fontWeight: '',
    textDecoration: '',
    textDecorationHover: '',
  },
  favorite: {
    color: '',
    colorHover: '',
    colorActive: '',
    colorFilled: '',
    colorFilledHover: '',
    colorFilledActive: '',
  },
})

export const pageHeader = style({
  width: '100%',
  height: pageHeaderContract.height,
  background: pageHeaderContract.background,
  color: pageHeaderContract.text,
  borderBottom: pageHeaderContract.borderBottom,
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  zIndex: vars.zIndex['2x'],
})

export const pageHeaderLeft = style({
  display: 'flex',
  flex: 1,
  alignItems: 'center',
})

export const pageHeaderBack = style({
  width: '67px',
  background: pageHeaderContract.back.backgroundColor,
  height: pageHeaderContract.height,
  fontSize: vars.fontSize.lg,
  paddingLeft: vars.space['2x'],
  paddingRight: vars.space['2x'],
  selectors: {
    '&:hover': {
      background: pageHeaderContract.back.backgroundColor,
    },
    '&:active': {
      background: pageHeaderContract.back.backgroundColorActive,
    },
  },
})

export const pageHeaderLogo = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
})

export const pageHeaderLinks = style({
  listStyle: 'none',
  display: 'inline-flex',
  fontSize: vars.fontSize.body,
  marginRight: vars.space['2x'],
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0',
})

export const pageHeaderLinksHiddenOnMobile = style({
  display: 'none',
  '@media': {
    [breakpoints.sm]: { display: 'flex' },
  },
})

export const pageHeaderLink = style({
  color: pageHeaderContract.links.color,
  fontWeight: pageHeaderContract.links.fontWeight,
  height: pageHeaderContract.height,
  lineHeight: 1,
  minWidth: vars.space['12x'],
  textDecoration: pageHeaderContract.links.textDecoration,
  selectors: {
    '&:hover': {
      color: pageHeaderContract.links.colorHover,
      textDecoration: pageHeaderContract.links.textDecorationHover,
    },
    '&:active': {
      color: pageHeaderContract.links.colorActive,
    },
  },
  paddingLeft: 15,
  paddingRight: 15,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
})

export const pageHeaderPipe = style({
  display: 'none',
  selectors: {
    '&::before': {
      content: '',
      display: 'inline-flex',
      width: '2px',
      height: '1em',
      background: vars.color.gray200,
      lineHeight: 1,
      alignSelf: 'center',
    },
  },
  '@media': {
    [breakpoints.lg]: { display: 'inline-flex' },
  },
})

export const pageHeaderMobileContent = style({
  paddingRight: vars.space['4x'],
  display: 'block',
  '@media': {
    [breakpoints.sm]: {
      display: 'none',
    },
  },
})

export const pageHeaderFixed = style({
  position: 'sticky',
  top: '0',
  zIndex: vars.zIndex['3x'],
})

export const pageHeaderSkipLink = style({
  backgroundColor: vars.color.white,
  border: \`1px solid $\{vars.color.gray200\}\`,
  zIndex: vars.zIndex['2x'],
  padding: vars.space['4x'],
  fontSize: vars.fontSize.md,
})

export const pageHeaderRemainingLinks = style({
  display: 'none',
  '@media': {
    [breakpoints.md]: {
      display: 'inline-flex',
    },
  },
})

export const pageHeaderFavoriteLink = style({
  color: pageHeaderContract.links.color,
  fontWeight: 'bold',
  height: pageHeaderContract.height,
  textDecoration: 'none',
  minWidth: vars.space['12x'],
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space['1x'],
  padding: vars.space['2x'],
  selectors: {
    '&:hover': {
      color: pageHeaderContract.favorite.colorHover,
    },
    '&:active': {
      color: pageHeaderContract.favorite.colorActive,
    },
  },
})

export const pageHeaderFavoriteFilledIcon = style({
  color: pageHeaderContract.favorite.colorFilled,
  selectors: {
    '&:hover': {
      color: pageHeaderContract.favorite.colorFilledHover,
    },
    '&:active': {
      color: pageHeaderContract.favorite.colorFilledHover,
    },
  },
})

export const pageHeaderCount = style({
  color: pageHeaderContract.links.color,
  display: 'block',
  paddingRight: vars.space['2x'],
})

export const pageHeaderHiddenWithMobileContent = style({
  display: 'none',
  '@media': {
    [breakpoints.sm]: {
      display: 'flex',
    },
  },
})

export const pageHeaderLoginLink = style({
  display: 'inline-flex',
})

export const pageHeaderSignupLink = style({
  display: 'none',
  '@media': {
    [breakpoints.sm]: { display: 'inline-flex' },
  },
})`;

    expect(applyTransform(...transformArgs(input))).toMatchInlineSnapshot(`
      ".pageHeaderContract {
        --background: ;
        --text: ;
        --height: ;
        --border-bottom: ;
        --back: undefined;
        --links: undefined;
        --favorite: undefined;
      }

      .pageHeader {
        width: 100%;
        height: var(--height);
        background: var(--background);
        color: var(--text);
        border-bottom: var(--border-bottom);
        display: flex;
        align-items: center;
        position: relative;
      }

      .pageHeaderLeft {
        display: flex;
        flex: 1px;
        align-items: center;
      }

      .pageHeaderBack {
        width: 67px;
        height: var(--height);
      }

      .pageHeaderBack:hover {
        background: undefined;
      }

      .pageHeaderBack:active {
        background: undefined;
      }

      .pageHeaderLogo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .pageHeaderLinks {
        list-style: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }

      .pageHeaderLinksHiddenOnMobile {
        display: none;
      }

      @media undefined {
        .pageHeaderLinksHiddenOnMobile {
          display: flex;
        }
      }
      .pageHeaderLink {
        height: var(--height);
        line-height: 1;
        padding-left: 15px;
        padding-right: 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .pageHeaderLink:hover {
        color: undefined;

        text-decoration: undefined;
      }

      .pageHeaderLink:active {
        color: undefined;
      }

      .pageHeaderPipe {
        display: none;
      }

      .pageHeaderPipe::before {
        content: ;

        display: inline-flex;

        width: 2px;

        height: 1em;

        background: undefined;

        line-height: 1;

        align-self: center;
      }

      @media undefined {
        .pageHeaderPipe {
          display: inline-flex;
        }
      }
      .pageHeaderMobileContent {
        display: block;
      }

      @media undefined {
        .pageHeaderMobileContent {
          display: none;
        }
      }
      .pageHeaderFixed {
        position: sticky;
        top: 0;
      }

      .pageHeaderSkipLink {
      }

      .pageHeaderRemainingLinks {
        display: none;
      }

      @media undefined {
        .pageHeaderRemainingLinks {
          display: inline-flex;
        }
      }
      .pageHeaderFavoriteLink {
        font-weight: bold;
        height: var(--height);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
      }

      .pageHeaderFavoriteLink:hover {
        color: undefined;
      }

      .pageHeaderFavoriteLink:active {
        color: undefined;
      }

      .pageHeaderFavoriteFilledIcon {
      }

      .pageHeaderFavoriteFilledIcon:hover {
        color: undefined;
      }

      .pageHeaderFavoriteFilledIcon:active {
        color: undefined;
      }

      .pageHeaderCount {
        display: block;
      }

      .pageHeaderHiddenWithMobileContent {
        display: none;
      }

      @media undefined {
        .pageHeaderHiddenWithMobileContent {
          display: flex;
        }
      }
      .pageHeaderLoginLink {
        display: inline-flex;
      }

      .pageHeaderSignupLink {
        display: none;
      }

      @media undefined {
        .pageHeaderSignupLink {
          display: inline-flex;
        }
      }"
    `);
  });
});

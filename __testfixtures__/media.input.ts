const styleWithMedia = style({
  '@media': {
    'screen and (min-width: 768px)': {
      padding: 10,
      margin: `${vars.space['2x']} ${vars.space['4x']}`,
    },
    '(prefers-reduced-motion)': {
      transitionProperty: 'color'
    }
  }
});

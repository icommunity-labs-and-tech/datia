import { createTheme, DEFAULT_THEME, mergeMantineTheme } from '@mantine/core';

const datiaBlue: [string, string, string, string, string, string, string, string, string, string] = [
  '#EEF3FC', // 0
  '#D5E3F8', // 1
  '#AACAF1', // 2
  '#7DAEE8', // 3
  '#5090DE', // 4
  '#2A73D4', // 5
  '#1752CC', // 6 ← primary
  '#1244A8', // 7
  '#0D3585', // 8
  '#082561', // 9
];

const datiaAmber: [string, string, string, string, string, string, string, string, string, string] = [
  '#FEF5E7', // 0
  '#FDEAC9', // 1
  '#FBD18A', // 2
  '#F9B84B', // 3
  '#F7A625', // 4
  '#F0930A', // 5 ← primary
  '#C47508', // 6
  '#9A5C06', // 7
  '#714304', // 8
  '#4A2C02', // 9
];

export const mantineTheme = mergeMantineTheme(
  DEFAULT_THEME,
  createTheme({
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    primaryColor: 'datiaBlue',
    primaryShade: 6,
    colors: {
      datiaBlue,
      datiaAmber,
    },
    defaultRadius: 'md',
    components: {
      Card: {
        defaultProps: {
          shadow: 'sm',
          withBorder: true,
        },
      },
      Button: {
        defaultProps: {
          radius: 'md',
        },
      },
    },
  })
);

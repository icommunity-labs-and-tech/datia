import { createTheme, DEFAULT_THEME, mergeMantineTheme } from '@mantine/core';

type MantineColorTuple = [string, string, string, string, string, string, string, string, string, string];

const datiaBlue: MantineColorTuple = [
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

const datiaAmber: MantineColorTuple = [
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

/**
 * Neutral scale tuned for the light dashboard surface: cool, low-saturation
 * greys so that hairline borders read as structure instead of as boxes.
 */
const datiaGray: MantineColorTuple = [
  '#F7F8FA', // 0 ← app background
  '#F1F3F6', // 1 ← subtle fills / hover
  '#E7EAF0', // 2 ← hairline borders
  '#D6DBE4', // 3
  '#B9C0CD', // 4
  '#8E97A8', // 5 ← dimmed text
  '#6B7486', // 6
  '#4B5364', // 7
  '#333B49', // 8
  '#1D2330', // 9 ← headings
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
      gray: datiaGray,
    },
    black: '#1D2330',
    defaultRadius: 'md',
    radius: {
      xs: '4px',
      sm: '6px',
      md: '10px',
      lg: '14px',
      xl: '20px',
    },
    /** Flat by default — depth is reserved for floating layers (menus, modals). */
    shadows: {
      xs: '0 1px 2px rgba(29, 35, 48, 0.05)',
      sm: '0 1px 3px rgba(29, 35, 48, 0.06), 0 1px 2px rgba(29, 35, 48, 0.04)',
      md: '0 4px 12px rgba(29, 35, 48, 0.07)',
      lg: '0 12px 28px rgba(29, 35, 48, 0.10)',
      xl: '0 24px 48px rgba(29, 35, 48, 0.13)',
    },
    headings: {
      fontWeight: '650',
      sizes: {
        h1: { fontSize: '1.65rem', lineHeight: '1.25' },
        h2: { fontSize: '1.35rem', lineHeight: '1.3' },
        h3: { fontSize: '1.15rem', lineHeight: '1.35' },
        h4: { fontSize: '1rem', lineHeight: '1.4' },
        h5: { fontSize: '0.9375rem', lineHeight: '1.45' },
        h6: { fontSize: '0.8125rem', lineHeight: '1.5' },
      },
    },
    other: {
      appBg: '#F7F8FA',
      surface: '#FFFFFF',
      hairline: '#E7EAF0',
    },
    components: {
      Paper: {
        defaultProps: {
          shadow: undefined,
          withBorder: true,
          radius: 'md',
        },
      },
      Card: {
        defaultProps: {
          shadow: undefined,
          withBorder: true,
          radius: 'md',
        },
      },
      Button: {
        defaultProps: {
          radius: 'md',
        },
        styles: {
          root: { fontWeight: 550 },
        },
      },
      Badge: {
        defaultProps: {
          radius: 'sm',
        },
        styles: {
          label: { fontWeight: 600, letterSpacing: 0.1 },
        },
      },
      Tabs: {
        styles: {
          tab: { fontWeight: 550 },
        },
      },
      Modal: {
        defaultProps: {
          radius: 'lg',
          shadow: 'xl',
          centered: true,
        },
      },
      Menu: {
        defaultProps: {
          radius: 'md',
          shadow: 'lg',
        },
      },
      Tooltip: {
        defaultProps: {
          radius: 'sm',
          withArrow: true,
        },
      },
    },
  })
);

import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['en'],
    theme: {
      light: {
        colors: {
          primary100: '#fef3c7',
          primary200: '#fde68a',
          primary500: '#92400e',
          primary600: '#78350f',
          primary700: '#451a03',
        },
      },
      dark: {
        colors: {
          primary100: '#fef3c7',
          primary200: '#fde68a',
          primary500: '#d97706',
          primary600: '#f59e0b',
          primary700: '#fbbf24',
        },
      },
    },
    tutorials: false,
    notifications: { releases: false },
  },
  bootstrap(app: StrapiApp) {
    // No sidebar hover - keep default icon-only sidebar
  },
};

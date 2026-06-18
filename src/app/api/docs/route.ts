import { ApiReference } from '@scalar/nextjs-api-reference';

const customCss = `
  /* ── Brand accent ─────────────────────────────────── */
  :root,
  .light-mode,
  .dark-mode {
    --scalar-color-accent: #0d6efd;
  }

  /* ── Light mode: clean white with blue undertone ───── */
  .light-mode {
    --scalar-background-accent: rgba(13, 110, 253, 0.06);
    --scalar-border-color: rgba(13, 110, 253, 0.10);
  }

  /* ── Sidebar: gradient header matching the dashboard ── */
  .sidebar .sidebar-heading,
  .t-doc__sidebar .sidebar-heading {
    background: linear-gradient(135deg, rgba(13,110,253,0.08), rgba(102,16,242,0.04));
    border-bottom: 1px solid rgba(13,110,253,0.12);
  }

  /* ── Active nav item ────────────────────────────────── */
  .sidebar .sidebar-item.active > .sidebar-item-link,
  .t-doc__sidebar .sidebar-item.active > .sidebar-item-link {
    background: rgba(13, 110, 253, 0.08);
    color: #0d6efd;
    border-left: 2px solid #0d6efd;
  }

  /* ── GET badge ──────────────────────────────────────── */
  .light-mode .badge.get,
  .dark-mode .badge.get {
    background: rgba(13, 110, 253, 0.10);
    color: #0d6efd;
    border: 1px solid rgba(13,110,253,0.25);
  }

  /* ── "Try it" / Send button ─────────────────────────── */
  .scalar-button-primary,
  button[data-test-id="send-request-button"] {
    background: linear-gradient(90deg, #0d6efd, #6610f2) !important;
    border: none !important;
  }

  /* ── Section header accent bar ──────────────────────── */
  .section-header {
    border-left: 3px solid #0d6efd;
    padding-left: 10px;
  }
`;

const handler = ApiReference({
  url: '/api/openapi.json',
  theme: 'alternate',
  layout: 'modern',
  darkMode: false,
  customCss,
  defaultHttpClient: {
    targetKey: 'js',
    clientKey: 'fetch',
  },
  metaData: {
    title: 'Datia API Reference',
    description: 'RESTful API for the Datia platform',
  },
});

export { handler as GET };

import type { Preview } from '@storybook/nextjs-vite';

import '../src/app/globals.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div
        className="portal-app"
        style={{
          alignItems: 'center',
          background: 'var(--portal-canvas)',
          display: 'flex',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      expanded: true,
    },
    layout: 'fullscreen',
  },
};

export default preview;

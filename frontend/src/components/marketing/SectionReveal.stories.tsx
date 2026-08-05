import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SectionReveal } from './SectionReveal';

const meta = {
  component: SectionReveal,
  tags: ['autodocs'],
  title: 'Marketing/SectionReveal',
} satisfies Meta<typeof SectionReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SectionReveal className="qts-section">
      <div className="qts-shell">
        <p className="qts-kicker">Chuyển động có kiểm soát</p>
        <h2>Nội dung xuất hiện khi bắt đầu đi vào viewport.</h2>
      </div>
    </SectionReveal>
  ),
};

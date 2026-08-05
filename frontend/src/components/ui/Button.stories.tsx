import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Plus } from 'lucide-react';

import { Button } from './Button';

const meta = {
  args: {
    children: 'Tạo tenant',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['default', 'compact', 'icon'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'critical'],
    },
  },
  component: Button,
  title: 'UI/Button',
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
};

export const Critical: Story = {
  args: {
    children: 'Thu hồi phiên',
    variant: 'critical',
  },
};

export const Icon: Story = {
  args: {
    'aria-label': 'Tạo tenant',
    children: <Plus aria-hidden="true" />,
    size: 'icon',
    title: 'Tạo tenant',
    variant: 'primary',
  },
};

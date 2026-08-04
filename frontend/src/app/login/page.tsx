import type { Metadata } from 'next';

import { SITE_NAME } from '@/src/marketing/site';
import LoginEntry from '@/src/screens/LoginEntry';

export const metadata: Metadata = {
  title: 'Đăng nhập hệ thống',
  description: `Đăng nhập hệ thống ${SITE_NAME} bằng tài khoản Google đã được cấp quyền.`,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginEntry />;
}

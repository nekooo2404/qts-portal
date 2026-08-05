import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, SearchX } from 'lucide-react';

import { SITE_NAME } from '../marketing/site';

export default function NotFound() {
  return (
    <main className="portal-public-state" data-portal="true" id="main-content">
      <Image alt="Logo khiên QTS" height={72} src="/qts-logo-160.webp" width={72} />
      <SearchX aria-hidden="true" />
      <p className="portal-eyebrow">404 · {SITE_NAME}</p>
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn này không tồn tại hoặc đã được chuyển sang khu vực khác.</p>
      <Link className="portal-button portal-button--primary" href="/">
        <ArrowLeft aria-hidden="true" /> Về trang chủ
      </Link>
    </main>
  );
}

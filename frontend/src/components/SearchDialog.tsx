'use client';

import { ArrowUpRight, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { filterSearchEntries } from '../lib/search';
import { searchItems } from '../marketing/content';

export function SearchDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => filterSearchEntries(searchItems, query).slice(0, 10), [query]);

  const closeDialog = () => {
    setQuery('');
    onClose();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      inputRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="qts-search"
      aria-labelledby="search-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div className="qts-search__surface">
        <header className="qts-search__header">
          <div>
            <h2 id="search-title">Tìm trong QTS Việt Nam</h2>
            <p>Dịch vụ, giải pháp, dự án và tin tức.</p>
          </div>
          <button className="qts-icon-button" type="button" aria-label="Đóng tìm kiếm" title="Đóng" onClick={closeDialog}>
            <X aria-hidden="true" />
          </button>
        </header>

        <label className="qts-search__field" htmlFor="qts-search-input">
          <Search aria-hidden="true" />
          <span className="visually-hidden">Tìm trong website QTS</span>
          <input
            ref={inputRef}
            id="qts-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ví dụ: cloud, website, SLA"
            autoComplete="off"
          />
        </label>

        <p className="qts-search__count" aria-live="polite">
          {results.length > 0 ? `${results.length} kết quả phù hợp` : 'Không tìm thấy nội dung phù hợp.'}
        </p>

        {results.length > 0 && (
          <ul className="qts-search__results">
            {results.map((item) => (
              <li key={item.id}>
                <Link href={item.href} onClick={closeDialog}>
                  <span>{item.category}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}

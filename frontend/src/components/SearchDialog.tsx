import { ArrowUpRight, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { searchEntries } from '../content';
import { filterSearchEntries } from '../lib/search';

type SearchDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(
    () => filterSearchEntries(searchEntries, query),
    [query],
  );
  const closeDialog = () => {
    setQuery('');
    onClose();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      inputRef.current?.focus();
    }

    if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="search-dialog"
      aria-labelledby="search-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div className="search-dialog__surface">
        <header className="search-dialog__header">
          <div>
            <h2 id="search-title">Tìm nhanh</h2>
            <p>Năng lực, quy trình và tài nguyên QTS.</p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Đóng tìm kiếm"
            title="Đóng"
            onClick={closeDialog}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <label className="search-field" htmlFor="portal-search">
          <Search aria-hidden="true" />
          <span className="visually-hidden">Tìm trong portal</span>
          <input
            ref={inputRef}
            id="portal-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pentest, cloud, ứng phó"
            autoComplete="off"
          />
        </label>

        <p className="search-dialog__count" aria-live="polite">
          {results.length > 0
            ? `${results.length} kết quả`
            : 'Không có kết quả phù hợp.'}
        </p>

        {results.length > 0 && (
          <ul className="search-results" role="list">
            {results.map((entry) => (
              <li key={entry.id}>
                <a href={entry.href} onClick={closeDialog}>
                  <span className="search-results__category">{entry.category}</span>
                  <strong>{entry.title}</strong>
                  <span>{entry.description}</span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}

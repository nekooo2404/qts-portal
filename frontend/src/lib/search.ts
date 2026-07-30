export type SearchEntry = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  href: string;
  category: string;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim();
}

export function filterSearchEntries(
  entries: SearchEntry[],
  query: string,
): SearchEntry[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return entries;
  }

  return entries.filter((entry) => {
    const searchableText = [
      entry.title,
      entry.description,
      entry.category,
      ...entry.keywords,
    ]
      .map(normalizeSearchText)
      .join(' ');

    return searchableText.includes(normalizedQuery);
  });
}

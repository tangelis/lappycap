'use client';

interface SearchSortBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortOptions?: { value: string; label: string }[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOrder?: 'asc' | 'desc';
  onSortOrderToggle?: () => void;
  resultCount?: number;
}

export function SearchSortBar({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  sortOptions = [],
  sortValue = '',
  onSortChange,
  sortOrder = 'asc',
  onSortOrderToggle,
  resultCount,
}: SearchSortBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-base sm:text-sm"
          aria-label="Search"
        />
      </div>
      {sortOptions.length > 0 && onSortChange && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="text-sm text-gray-500 whitespace-nowrap" htmlFor="sort-by">Sort by</label>
          <select
            id="sort-by"
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-base sm:text-sm"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {onSortOrderToggle && (
            <button
              type="button"
              onClick={onSortOrderToggle}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm flex items-center justify-center"
              title={sortOrder === 'asc' ? 'Ascending (click for descending)' : 'Descending (click for ascending)'}
              aria-label="Toggle sort order"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          )}
        </div>
      )}
      {resultCount !== undefined && (
        <span className="text-sm text-gray-500 self-center">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-body" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 leading-5 bg-background focus:outline-none text-title sm:text-sm"
        placeholder="Search blog posts..."
        value={query}
        onChange={handleSearch}
      />
    </div>
  );
};

export default SearchBar;
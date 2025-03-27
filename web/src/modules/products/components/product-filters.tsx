"use client";

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import './product-filters.css';
import { Product } from '@/types';
import Link from 'next/link';

interface FilterProps {
  products: Product[];
  onCategoryChange: (category: string) => void;
  onArtistChange: (artist: string) => void;
}

export function ProductFilters({ products, onCategoryChange, onArtistChange }: FilterProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArtist, setSelectedArtist] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [artists, setArtists] = useState<string[]>(['all']);
  const [filteredArtists, setFilteredArtists] = useState<string[]>(['all']);

  const categories = [
    'all',
    'Fishing',
    'Camping',
    'Hunting',
    'Other'

  ];

  useEffect(() => {
    const uniqueBrands = Array.from(new Set(
      products.map(product => product.brand)
    )).filter(Boolean).sort();
    
    setArtists(['all', ...uniqueBrands]);
  }, [products]);

  const filterArtists = (search: string) => {
    setSearchTerm(search);
    setIsSearching(search.length > 0);
    
    if (search) {
      const filtered = artists.filter(artist => 
        artist !== 'all' && artist.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredArtists(filtered);
    } else {
      setFilteredArtists(['all']);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    onCategoryChange(category === 'all' ? '' : category);
  };

  const handleArtistChange = (artist: string) => {
    setSelectedArtist(artist);
    onArtistChange(artist === 'all' ? '' : artist);
  };

  const handleArtistClick = (brand: string) => {
    setSelectedArtist(brand);
    setSearchTerm('');
    setIsSearching(false);
  };

  return (
    <div className="filters-container">
      <div className="filter-section">
        <h3 className="filter-title">კატეგორიები</h3>
        <div className="filter-options">
          {categories.map((category) => (
            <button
              key={category}
              className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => handleCategoryChange(category)}
            >
              {category === 'all' ? 'ყველა' : category}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3 className="filter-title">მხატვრები</h3>
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="მოძებნე მხატვარი..."
            value={searchTerm}
            onChange={(e) => filterArtists(e.target.value)}
            onFocus={() => setIsSearching(true)}
            className="search-input"
          />
        </div>
        {(isSearching || selectedArtist !== 'all') && (
          <div className="filter-options scrollable">
            {(searchTerm ? filteredArtists : artists).map((brand) => (
              brand !== 'all' && (
                <Link 
                  key={brand} 
                  href={`/shop?brand=${encodeURIComponent(brand)}`}
                  className={`filter-btn ${selectedArtist === brand ? 'active' : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleArtistClick(brand)}
                >
                  {brand}
                </Link>
              )
            ))}
          </div>
        )}
        {selectedArtist !== 'all' && (
          <div className="selected-filter">
            <button
              className="clear-filter"
              onClick={() => {
                handleArtistChange('all');
                setSearchTerm('');
                setIsSearching(false);
              }}
            >
              × {selectedArtist}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  selectedCategory?: string; // Add this prop
}

export function ProductFilters({ 
  products, 
  onCategoryChange, 
  onArtistChange,
  selectedCategory: initialCategory = 'all' // Add default value
}: FilterProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedArtist, setSelectedArtist] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [artists, setArtists] = useState<string[]>(['all']);
  const [filteredArtists, setFilteredArtists] = useState<string[]>(['all']);

  const categories = [
    'all',
    "პეიზაჟი",
    "პორტრეტი",
    "აბსტრაქცია",
    "შავ-თეთრი",
    "ანიმაციური",
    "ციფრული ილუსტრაციები",
    "სხვა",
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
    console.log('Changing category to:', category); // Debug log
    const newCategory = category === 'all' ? '' : category;
    setSelectedCategory(category);
    onCategoryChange(newCategory);

    // Reset artist filter when changing category
    if (selectedArtist !== 'all') {
      handleArtistChange('all');
    }
  };

  const handleArtistChange = (artist: string) => {
    const newArtist = artist === 'all' ? '' : artist;
    setSelectedArtist(artist);
    onArtistChange(newArtist);

    // Reset category filter when changing artist
    if (selectedCategory !== 'all') {
      setSelectedCategory('all');
      onCategoryChange('');
    }
  };

  const handleArtistClick = (brand: string) => {
    setSelectedArtist(brand);
    setSearchTerm('');
    setIsSearching(false);
  };

  useEffect(() => {
    if (initialCategory !== 'all') {
      handleCategoryChange(initialCategory);
    }
  }, [initialCategory]);

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
        {selectedCategory !== 'all' && (
          <div className="selected-filter">
            <button
              className="clear-filter"
              onClick={() => handleCategoryChange('all')}
            >
              × {selectedCategory}
            </button>
          </div>
        )}
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
                  onClick={() => {
                    handleArtistClick(brand);
                  }}
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

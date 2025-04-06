"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import './room-viewer.css';

// Import room images to ensure they're properly loaded
import livingRoomImg from '@/assets/roomview/Living_Room-removebg-preview.png';
import bedroomImg from '@/assets/roomview/bedroom-removebg-preview.png';
import kitchenImg from '@/assets/roomview/dinning.png';
import hallImg from '@/assets/roomview/hall-removebg-preview.png';

type RoomType = 'living' | 'bedroom' | 'kitchen' | 'hall';

interface RoomViewerProps {
  productImage: string;
  isOpen: boolean;
  onClose: () => void;
}

const rooms = {
  living: livingRoomImg,
  bedroom: bedroomImg,
  kitchen: kitchenImg,
  hall: hallImg,
};

const colorOptions = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Cream', value: '#FFF8E1' },
  { name: 'Light Gray', value: '#F5F5F5' },
  { name: 'Beige', value: '#F5F5DC' },
  { name: 'Light Blue', value: '#E3F2FD' },
  { name: 'Soft Green', value: '#E8F5E9' },
  { name: 'Lavender', value: '#F3E5F5' },
  { name: 'Peach', value: '#FFDAB9' },
  { name: 'Light Yellow', value: '#FFFDE7' },
  { name: 'Mint', value: '#E0F2F1' },
  { name: 'Sky Blue', value: '#BBDEFB' },
  { name: 'Blush Pink', value: '#FFEBEE' },
];

export function RoomViewer({ productImage, isOpen, onClose }: RoomViewerProps) {
  const [currentRoom, setCurrentRoom] = useState<RoomType>('living');
  const [wallColor, setWallColor] = useState('#FFFFFF');
  const [productPosition, setProductPosition] = useState({ x: 0, y: 0 });
  const [productSize, setProductSize] = useState(30); // percentage of container height
  const [roomImagesLoaded, setRoomImagesLoaded] = useState(false);
  const [productLoaded, setProductLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Verify room images are loaded properly
  useEffect(() => {
    // Check if all room images exist and are loaded
    const checkImagesLoaded = async () => {
      try {
        // Just verify the images exist
        if (livingRoomImg && bedroomImg && kitchenImg && hallImg) {
          setRoomImagesLoaded(true);
        }
      } catch (error) {
        console.error("Error loading room images:", error);
      }
    };

    checkImagesLoaded();
  }, []);

  // Reset product position to center when room changes or modal opens
  useEffect(() => {
    setProductPosition({ x: 0, y: 0 });
  }, [currentRoom, isOpen]);

  // Log when product image changes to help with debugging
  useEffect(() => {
    console.log("Product image:", productImage);
    setProductLoaded(false);
  }, [productImage]);

  // Fix the size calculation to ensure it's applying correctly
  useEffect(() => {
    if (productImage) {
      // Reset position and size when product changes
      setProductPosition({ x: 0, y: 0 });
      // Set a reasonable default size
      setProductSize(30);
    }
  }, [productImage]);

  const handleRoomChange = (room: RoomType) => {
    setCurrentRoom(room);
    // Reset product position when room changes
    setProductPosition({ x: 0, y: 0 });
  };

  const handleColorChange = (color: string) => {
    setWallColor(color);
  };

  // Handle size change with immediate feedback
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(e.target.value);
    setProductSize(newSize);
    console.log("Size changed to:", newSize);
  };

  if (!isOpen) return null;

  return (
    <div className="room-viewer-overlay">
      <div className="room-viewer-modal">
        <button className="close-button" onClick={onClose}>×</button>

        <h2 className="room-viewer-title">მოარგე ოთახს</h2>

        <div className="room-controls">
          <div className="room-selector">
            <label>აირჩიე ოთახი:</label>
            <div className="room-buttons">
              <button
                className={currentRoom === 'living' ? 'active' : ''}
                onClick={() => handleRoomChange('living')}
              >
                მისაღები
              </button>
              <button
                className={currentRoom === 'bedroom' ? 'active' : ''}
                onClick={() => handleRoomChange('bedroom')}
              >
                საძინებელი
              </button>
              <button
                className={currentRoom === 'kitchen' ? 'active' : ''}
                onClick={() => handleRoomChange('kitchen')}
              >
                სამზარეულო
              </button>
              <button
                className={currentRoom === 'hall' ? 'active' : ''}
                onClick={() => handleRoomChange('hall')}
              >
                დერეფანი
              </button>
            </div>
          </div>

          <div className="product-size-control">
            <label>ნამუშევრის ზომა: {productSize}%</label>
            <input
              type="range"
              min="10"
              max="60"
              value={productSize}
              onChange={handleSizeChange}
            />
          </div>

          <div className="color-selector">
            <label>კედლის ფერი:</label>
            <div className="color-options">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  className={`color-option ${wallColor === color.value ? 'active' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleColorChange(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="room-view-container" ref={containerRef} style={{ backgroundColor: wallColor }}>
          <div className="room-image-wrapper">
            {roomImagesLoaded ? (
              <Image
                src={rooms[currentRoom]}
                alt={`${currentRoom} view`}
                fill
                className="room-image"
              />
            ) : (
              <div className="loading-message">ოთახის სურათების ჩატვირთვა...</div>
            )}

            <motion.div
              className="product-on-wall"
              drag
              dragConstraints={containerRef}
              dragMomentum={false}
              style={{
                height: `${productSize}%`,
                width: 'auto',
                position: 'absolute',
                top: '30%',
                left: '40%',
                transform: 'translate(-50%, -50%)',
                x: productPosition.x,
                y: productPosition.y
              }}
              onDragEnd={(event, info) => {
                setProductPosition({
                  x: productPosition.x + info.offset.x,
                  y: productPosition.y + info.offset.y
                });
              }}
            >
              {productImage && (
                <div className="product-image-container">
                  <Image
                    src={productImage}
                    alt="Product"
                    width={300}
                    height={300}
                    className="room-product-image"
                    style={{
                      objectFit: 'contain',
                      width: 'auto',
                      height: '100%',
                      border: 'none',
                      clipPath: 'none',
                      WebkitClipPath: 'none'
                    }}
                    unoptimized={true} // Use original image without Next.js optimization
                    priority
                    onLoad={() => setProductLoaded(true)}
                    onError={(e) => {
                      console.error("Error loading product image:", e);
                    }}
                  />
                  {!productLoaded && (
                    <div className="product-loading">
                      ნამუშევრების ჩატვირთვა...
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        <div className="instructions">
          <p>გადაიტანეთ არჩეული პროდუქტი კედელზე სასურველ პოზიციაზე. გამოიყენეთ ზომის რეგულატორი.</p>
        </div>
      </div>
    </div>
  );
}

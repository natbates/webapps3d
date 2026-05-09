import React from 'react';

import '../../styles/CarouselInfoBox.css';

function CarouselInfoBox({ box }) {
  return (
    <div className="carousel-info-box">
      <div className="carousel-info-box-title">
        {box.title.toUpperCase()}
      </div>
      {box.type === 'image' && box.src && (
        <img
          src={box.src}
          alt={box.title}
          className="carousel-info-box-media"
        />
      )}
      {box.type === 'video' && box.src && (
        <video
          src={box.src}
          poster={box.poster}
          controls
          className="carousel-info-box-media"
        />
      )}
    </div>
  );
}

export default CarouselInfoBox;

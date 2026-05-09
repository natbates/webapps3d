import React from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import { useResources } from '../../context/ResourceContext';
import { useCarousel } from '../../context/CarouselContext';
import '../../styles/CarouselControls.css';

const CarouselControls = ({ onPrev, onNext }) => {

    const { productKeys, modelConfigs } = useResources();
    const {
        currentIndex,
        setCurrentIndex,
        isPaused,
        pauseCarousel,
        startAutoplay,
    } = useCarousel();

    const togglePlayPause = () => {
        if (isPaused) {
        startAutoplay();
        } else {
        pauseCarousel();
        }
    };

    const handleBarSelect = (index) => {
        setCurrentIndex(index);

                // Preserve a user-paused carousel when navigating via the bottom bars.
        if (isPaused) {
            pauseCarousel();
        }
    };

    const mid = Math.ceil(productKeys.length / 2);

    const leftKeys = productKeys.slice(0, mid);
    const rightKeys = productKeys.slice(mid);

    return (
        <div className="carousel-controls">

            <div className="carousel-bars left">
            {leftKeys.map((key, index) => {
                const realIndex = index;

                return (
                <button
                    key={key}
                    className={`carousel-bar ${realIndex === currentIndex ? 'active' : ''}`}
                    onClick={() => handleBarSelect(realIndex)}
                >
                    <div className="bar-fill" />
                    <span className="bar-label">
                    {modelConfigs[key]?.name || key}
                    </span>
                </button>
                );
            })}
            </div>

            <button
            className="carousel-playpause"
            onClick={togglePlayPause}
            >
            {isPaused ? <FaPlay size={8} /> : <FaPause size={8} />}
            </button>

            <div className="carousel-bars right">
            {rightKeys.map((key, index) => {
                const realIndex = index + mid;

                return (
                <button
                    key={key}
                    className={`carousel-bar ${realIndex === currentIndex ? 'active' : ''}`}
                    onClick={() => handleBarSelect(realIndex)}
                >
                    <div className="bar-fill" />
                    <span className="bar-label">
                    {modelConfigs[key]?.name || key}
                    </span>
                </button>
                );
            })}
            </div>

        </div>
    );
};
export default CarouselControls;
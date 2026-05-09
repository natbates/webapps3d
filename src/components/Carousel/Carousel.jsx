import React, { useState, useEffect, useRef } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useResources } from '../../context/ResourceContext';
import { useCarousel } from '../../context/CarouselContext';
import CarouselSlide from './CarouselSlide';
import CarouselControls from './CarouselControls';
import { FaSun } from "react-icons/fa6";
import { FaMoon } from "react-icons/fa6";

import '../../styles/Carousel.css';

const TRANSITION_MS = 650;

function Carousel() {
  const { productKeys } = useResources();
  const {
    currentIndex,
    setCurrentIndex,
    isPaused,
    startAutoplay,
    slideCount,
    setSlideCount,
    lightStrength,
    setLightStrength,
  } = useCarousel();

  const trackRef = useRef(null);
  const [translate, setTranslate] = useState(0);
  const translateRef = useRef(0);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [visualIndex, setVisualIndex] = useState(null);

  const safeSlideCount = productKeys.length;
  const repeatedKeys = [...productKeys, ...productKeys, ...productKeys];

  // Set slide count
  useEffect(() => {
    setSlideCount(safeSlideCount);
    if (safeSlideCount > 0) {
      setVisualIndex(safeSlideCount + currentIndex % safeSlideCount);
    }
  }, [productKeys, safeSlideCount, currentIndex, setSlideCount]);

  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

  // Recalculate on container size changes
  useEffect(() => {
    if (!trackRef.current) return;

    const carousel = trackRef.current.parentElement;
    if (!carousel || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      setLayoutVersion((prev) => prev + 1);
    });

    observer.observe(carousel);
    return () => observer.disconnect();
  }, []);

  // Calculate slide dimensions and track translation
  useEffect(() => {
    if (!trackRef.current || safeSlideCount === 0) return;

    const carousel = trackRef.current.parentElement;
    const containerWidth = carousel?.clientWidth || 0;
    if (containerWidth === 0) return;

    const slides = trackRef.current.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;

    const centerOffset = (slideElement) => {
      const slideLeft = slideElement.offsetLeft;
      const slideWidth = slideElement.clientWidth;
      const centered = Math.round(containerWidth / 2 - slideWidth / 2);
      return Math.round(centered - slideLeft);
    };

    const candidateIndices = [
      currentIndex,
      currentIndex + safeSlideCount,
      currentIndex + safeSlideCount * 2,
    ];

    const initialCandidate = currentIndex + safeSlideCount;

    const nearestVisualIndex =
      visualIndex === null
        ? initialCandidate
        : candidateIndices.reduce((bestIndex, candidate) => {
          const candidateSlide = slides[candidate];
          const bestSlide = slides[bestIndex];
          if (!candidateSlide || !bestSlide) return bestIndex;

          const candidateDistance = Math.abs(centerOffset(candidateSlide) - translateRef.current);
          const bestDistance = Math.abs(centerOffset(bestSlide) - translateRef.current);

          return candidateDistance < bestDistance ? candidate : bestIndex;
        }, candidateIndices[0]);

    const activeSlide = slides[nearestVisualIndex];
    if (!activeSlide) return;

    setVisualIndex(nearestVisualIndex);
    setTranslate(centerOffset(activeSlide));
  }, [currentIndex, safeSlideCount, layoutVersion, visualIndex]);

  // Apply transform
  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(.2,.9,.2,1)`;
    trackRef.current.style.transform = `translateX(${translate}px)`;
  }, [translate]);

  const handlePrevious = () => {
    if (safeSlideCount === 0) return;
    setCurrentIndex(prev => (prev - 1 + safeSlideCount) % safeSlideCount);
  };

  const handleNext = () => {
    if (safeSlideCount === 0) return;
    setCurrentIndex(prev => (prev + 1) % safeSlideCount);
  };

  const handleSlideClick = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div id="homeCarouselWrap">
      <div id="homeCarousel">
        <div
          id="carouselTrack"
          ref={trackRef}
          className="carousel-track"
        >
          {repeatedKeys.map((key, index) => (
            <CarouselSlide
              key={`${key}-${index}`}
              productKey={key}
              index={index % safeSlideCount}
              lightStrength={lightStrength}
              onClick={() => handleSlideClick(index % safeSlideCount)}
            />
          ))}
        </div>

        <button
          id="carouselPrev"
          className="carousel-button carousel-prev"
          aria-label="Previous"
          onClick={handlePrevious}
        >
          <FaChevronLeft size={8} />
        </button>

        <button
          id="carouselNext"
          className="carousel-button carousel-next"
          aria-label="Next"
          onClick={handleNext}
        >
          <FaChevronRight size={8} />
        </button>

        <CarouselControls onPrev={handlePrevious} onNext={handleNext} />

        <div className="light-strength-slider">
          <FaSun className='sun-icon' size={12} />
          <FaMoon className='moon-icon' size={12} />
          <input
            id="lightSlider"
            type="range"
            min="0.3"
            max="2"
            step="0.1"
            value={lightStrength}
            onChange={(e) => setLightStrength(parseFloat(e.target.value))}
            className="light-slider-input"
          />
          <span className="light-value">{lightStrength.toFixed(1)}x</span>
        </div>

      </div>
    </div>
  );
}

export default Carousel;

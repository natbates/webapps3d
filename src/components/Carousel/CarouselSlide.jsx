import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useResources } from '../../context/ResourceContext';
import { useCarousel } from '../../context/CarouselContext';
import CarouselCanvas from './CarouselCanvas';
import CarouselInfoBox from './CarouselInfoBox';

import '../../styles/CarouselSlide.css';

function CarouselSlide({ productKey, index, lightStrength, onClick }) {
  const { modelConfigs, productKeys } = useResources();
  const { isGrabbing, currentIndex } = useCarousel();
  const config = modelConfigs[productKey];
  const [infoBoxes, setInfoBoxes] = useState([]);
  const svgRef = useRef(null);
  const slideRef = useRef(null);
  const overlayRef = useRef(null);
  const modelAnchorRef = useRef(null);
  const drawFrameRef = useRef(null);

  const drawConnectors = useCallback(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const slide = slideRef.current;
    if (!slide) return;

    const slideRect = slide.getBoundingClientRect();
    if (slideRect.width === 0 || slideRect.height === 0) return;

    const fallbackCenter = {
      x: slideRect.width / 2,
      y: slideRect.height / 2,
    };
    const modelCenter = modelAnchorRef.current || fallbackCenter;

    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${slideRect.width} ${slideRect.height}`);
    svg.setAttribute('width', slideRect.width);
    svg.setAttribute('height', slideRect.height);

    const drawLine = (from, to) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      line.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '4,4');
      svg.appendChild(line);
    };

    const overlayElement = overlayRef.current;
    if (overlayElement) {
      const overlayRect = overlayElement.getBoundingClientRect();
      const overlayPoint = {
        x: overlayRect.left - slideRect.left + overlayRect.width / 2,
        y: overlayRect.bottom - slideRect.top,
      };
      drawLine(overlayPoint, modelCenter);
    }

    infoBoxes.forEach((box) => {
      const boxElement = slide.querySelector(`[data-box-id="${box.id}"]`);
      if (!boxElement) return;

      const boxRect = boxElement.getBoundingClientRect();
      const boxCenter = {
        x: boxRect.left - slideRect.left + boxRect.width / 2,
        y: boxRect.top - slideRect.top + boxRect.height / 2,
      };

      drawLine(modelCenter, boxCenter);
    });
  }, [infoBoxes]);

  const queueConnectorDraw = useCallback(() => {
    if (drawFrameRef.current) return;

    drawFrameRef.current = requestAnimationFrame(() => {
      drawFrameRef.current = null;
      drawConnectors();
    });
  }, [drawConnectors]);

  useEffect(() => {
    queueConnectorDraw();

    const onResize = () => queueConnectorDraw();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (drawFrameRef.current) {
        cancelAnimationFrame(drawFrameRef.current);
        drawFrameRef.current = null;
      }
    };
  }, [queueConnectorDraw, currentIndex]);

  const handleModelAnchorChange = useCallback((point) => {
    modelAnchorRef.current = point;
    queueConnectorDraw();
  }, [queueConnectorDraw]);

  const slideCount = productKeys.length;
  const diff = Math.abs(index - currentIndex);
  const distance = Math.min(diff, slideCount - diff);
  const slideClass =
    distance === 0 ? 'carousel-slide active'
      : distance === 1 ? 'carousel-slide near'
      : 'carousel-slide far';

  return (
    <div
      ref={slideRef}
      className={slideClass}
      onClick={onClick}
      data-product={productKey}
    >
      <div className="carousel-slide-canvas">
        <CarouselCanvas
          productKey={productKey}
          isGrabbing={isGrabbing}
          lightStrength={lightStrength}
          onModelScreenPointChange={handleModelAnchorChange}
        />
        {/* Connector lines SVG */}
        <svg
          ref={svgRef}
          className="carousel-slide-connector"
        />
      </div>

      <div className="carousel-slide-overlay" ref={overlayRef}>
        <h2>{config?.name || productKey}</h2>
        {config?.description && <p>{config.description}</p>}
      </div>

      {/* Info boxes coming off the item */}
      {infoBoxes.length > 0 && (
        <div className="carousel-info-boxes">
          {infoBoxes.map((box, i) => (
            <div
              key={box.id}
              data-box-id={box.id}
              className={`info-box-slot-${i}`}
            >
              <CarouselInfoBox box={box} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CarouselSlide;

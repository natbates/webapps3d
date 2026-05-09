import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useResources } from '../context/ResourceContext';
import '../styles/Model.css';

function Model() {
  const { id } = useParams();
  const { modelConfigs, loading, resolveResourceValue } = useResources();
  const model = id ? modelConfigs?.[id] : null;

  if (loading) {
    return (
      <main className="model-page">
        <h1 className="model-title">Loading...</h1>
      </main>
    );
  }

  if (!model) {
    return (
      <main className="model-page">
        <h1 className="model-title">Model Not Found</h1>
        <p className="model-summary">The requested model key does not exist in model config.</p>
        <Link to="/" className="model-back-link">Back to carousel</Link>
      </main>
    );
  }

  return (
    <main className="model-page">
      <h1 className="model-title">{model.name}</h1>

      <section className="model-section">
        <h2>{model.about?.title || 'Overview'}</h2>
        {model.about?.summary && <p className="model-summary">{model.about.summary}</p>}

        {Array.isArray(model.about?.details) && model.about.details.length > 0 && (
          <div className="model-details-list">
            {model.about.details.map((detail, index) => (
              <p key={`${model.key}-detail-${index}`}>{detail}</p>
            ))}
          </div>
        )}
      </section>

      <section className="model-section">
        <h2>Media</h2>
        {Array.isArray(model.about?.media) && model.about.media.length > 0 ? (
          <div className="model-media-grid">
            {model.about.media.map((media, index) => {
              const mediaTitle = media.title || `Media ${index + 1}`;
              const mediaSource = resolveResourceValue(media.src);
              const mediaPoster = resolveResourceValue(media.poster);

              return (
                <article key={`${model.key}-media-${index}`} className="model-media-card">
                  <h3>{mediaTitle}</h3>
                  {mediaSource ? (
                    media.type === 'video' ? (
                      <video controls src={mediaSource} poster={mediaPoster || undefined} />
                    ) : (
                      <img src={mediaSource} alt={mediaTitle} />
                    )
                  ) : (
                    <p className="model-summary">Media source is missing from config.</p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="model-summary">No media has been added for this model yet.</p>
        )}
      </section>

      <Link to="/" className="model-back-link">Back to carousel</Link>
    </main>
  );
}

export default Model;
'use client';

import { Container, Image, Badge, Button } from 'react-bootstrap';
import { formatCompactDate } from '@/lib/format';
import GeolocationMap from './GeolocationMapClient';
import { extractGeolocationField } from '@/lib/template-helpers';

export type TimelineItem = {
  id: string;
  title: string;
  date: string | Date; // ISO string, Date object, or readable string
  description: string;
  evidenceID?: string;
  imageUrls?: string[];
  backed?: boolean;
  backedAt?: string | Date;
  templateConfig?: any;
  statusType?: {
    name: string;
    description: string;
  };
};

interface TimelineProps {
  items: TimelineItem[];
  showDownloadButton?: boolean;
  showEvidenceLink?: boolean;
  className?: string;
}

export default function IncidentTimeline({ 
  items, 
  showDownloadButton = true, 
  showEvidenceLink = true,
  className = ""
}: TimelineProps) {
  return (
    <section className={`py-4 ${className}`}>
      <Container>
        <ul className="timeline list-unstyled">
          {items.map((item) => (
            <li key={item.id} className="timeline-item mb-5 position-relative">
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold mb-0">{item.title}</h5>
                {item.statusType && (
                  <Badge bg="info" pill title={item.statusType.description}>
                    {item.statusType.name}
                  </Badge>
                )}
                {item.backed && (
                  <Badge bg="success" pill>
                    Respaldado {item.backedAt ? `· ${formatCompactDate(item.backedAt)}` : ''}
                  </Badge>
                )}
              </div>
              <p className="text-muted mb-2 fw-bold">{formatCompactDate(item.date)}</p>
              <p className="text-muted">{item.description}</p>

              {/* Mostrar mapa de geolocalización si existe en templateConfig */}
              {(() => {
                const geolocationField = extractGeolocationField(item.templateConfig);
                if (geolocationField) {
                  return (
                    <div className="mb-3">
                      <GeolocationMap value={geolocationField} readOnly={true} />
                    </div>
                  );
                }
                return null;
              })()}

              {item.imageUrls && item.imageUrls.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {item.imageUrls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                      <Image
                        src={url}
                        alt={`Evidencia ${idx + 1}`}
                        thumbnail
                        style={{ width: 96, height: 96, objectFit: 'cover' }}
                      />
                    </a>
                  ))}
                </div>
              )}
              <div className="d-flex gap-3 align-items-center mt-2">
                {showEvidenceLink && item.evidenceID && (
                  <a
                    href={`https://checker.icommunitylabs.com/lookup/${item.evidenceID}`}
                    className="text-primary text-decoration-underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {"Consultar la certificación"}
                  </a>
                )}
                {showDownloadButton && (
                  <div className="d-flex gap-1 flex-wrap">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        const url = `/api/issues/${item.id}/issue-data`;
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `issue_data_${item.id}.json`;
                        link.click();
                      }}
                    >
                      <i className="bi bi-file-earmark-code me-1"></i>
                      JSON
                    </Button>
                    {item.imageUrls && item.imageUrls.length > 0 && (
                      item.imageUrls.map((_: any, imgIndex: number) => (
                        <Button
                          key={imgIndex}
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => {
                            const url = `/api/issues/${item.id}/images/${imgIndex + 1}`;
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `issue_image_${imgIndex + 1}.jpg`;
                            link.click();
                          }}
                        >
                          <i className="bi bi-image me-1"></i>
                          Img {imgIndex + 1}
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Container>

    <style jsx>{`
    .timeline {
        position: relative;
        padding-left: 1rem;
        border-left: 2px solid #dee2e6;
    }

    .timeline-item {
        position: relative;
        padding-left: 0.75rem;
    }

    .timeline-item::before {
        content: '';
        position: absolute;
        top: 0.4rem;
        left: -0.5rem;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: #0d6efd;
        border: 3px solid white;
        box-shadow: 0 0 0 2px #0d6efd;
    }
    `}</style>

    </section>
  );
}

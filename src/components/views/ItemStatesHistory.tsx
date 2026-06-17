/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Row, Col, Badge } from 'react-bootstrap';
import { formatValueWithSmartDateDetection } from '@/lib/format';
import { Box, BoxHeader, BoxTitle } from '../index';

interface State {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  imageUrls: string[];
  statusType: {
    id: string;
    name: string;
    description: string;
  };
}

interface ItemStatesHistoryProps {
  states: State[];
  itemName: string;
}

export default function ItemStatesHistory({ states, itemName }: ItemStatesHistoryProps) {
  if (!states || states.length === 0) {
    return (
      <Box>
        <BoxHeader title="Historial de Estados" />
        <div className="p-3 text-center text-muted">
          <p>No hay estados registrados para este item.</p>
        </div>
      </Box>
    );
  }

  return (
    <Box>
      <BoxHeader title={`Historial de Estados - ${itemName}`} />
      <div className="p-3">
        {states.map((state, index) => (
          <div key={state.id} className="state-item mb-3">
            <Row>
              <Col xs={12} md={8}>
                <div className="d-flex align-items-start gap-2 mb-2 flex-wrap">
                  <Badge 
                    bg={index === 0 ? 'success' : 'secondary'}
                    className="text-nowrap fw-bold"
                    style={{ fontSize: '0.75rem' }}
                  >
                    {index === 0 ? 'Estado Actual' : 'Estado Anterior'}
                  </Badge>
                  <Badge 
                    bg="info"
                    className="text-nowrap"
                    style={{ fontSize: '0.7rem' }}
                    title={state.statusType.description}
                  >
                    {state.statusType.name}
                  </Badge>
                  <h5 className={`mb-1 fw-bold ${index === 0 ? 'text-success' : 'text-dark'}`}>
                    {state.title}
                  </h5>
                </div>
                {state.description && (
                  <p className="text-secondary mb-2" style={{ fontSize: '0.95rem' }}>
                    {state.description}
                  </p>
                )}
                <div className="text-muted fw-medium" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-clock me-1"></i>
                  {formatValueWithSmartDateDetection(state.createdAt, 'createdAt')}
                </div>
              </Col>
              <Col xs={12} md={4}>
                {state.imageUrls && state.imageUrls.length > 0 && (
                  <div className="state-images">
                    <div className="d-flex gap-1 flex-wrap">
                      {state.imageUrls.slice(0, 3).map((imageUrl, imgIndex) => (
                        <img
                          key={imgIndex}
                          src={imageUrl}
                          alt={`Estado ${state.title}`}
                          className="img-thumbnail"
                          style={{ 
                            width: '60px', 
                            height: '60px', 
                            objectFit: 'cover' 
                          }}
                        />
                      ))}
                      {state.imageUrls.length > 3 && (
                        <div 
                          className="d-flex align-items-center justify-content-center bg-light border rounded"
                          style={{ width: '60px', height: '60px' }}
                        >
                          <small className="text-muted">
                            +{state.imageUrls.length - 3}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Col>
            </Row>
            {index < states.length - 1 && (
              <hr className="my-3" />
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .state-item {
          padding: 1.25rem;
          border-radius: 12px;
          background-color: #ffffff;
          border: 1px solid #e9ecef;
          border-left: 5px solid #dee2e6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }
        
        .state-item:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        
        .state-item:first-child {
          border-left-color: #198754;
          background-color: #f8fff9;
          border-color: #c3e6cb;
        }
        
        .state-images {
          display: flex;
          justify-content: flex-end;
        }
        
        @media (max-width: 768px) {
          .state-images {
            justify-content: flex-start;
            margin-top: 1rem;
          }
          
          .state-item {
            padding: 1rem;
          }
        }
      `}</style>
    </Box>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Container, Row, Col, Button, Spinner } from 'react-bootstrap';
import { Box, BoxHeader, Timeline, AddStateForm } from '@/components';
import { formatValueWithSmartDateDetection } from '@/lib/format';
import { useTranslations } from 'next-intl';
import { getItem } from '@/actions/items';
import { getStatesByItem } from '@/actions/states';
import { convertStatesToTimeline } from '@/lib/timeline';
import '@/app/operator/operator.css';

export default function OperatorItemDetailsPage() {
  const t = useTranslations('operator');
  const tTables = useTranslations('tables');
  const tCommon = useTranslations('common.actions');
  const router = useRouter();
  const params = useParams();
  const itemId = (params?.id as string) || '';

  const [item, setItem] = useState<any | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [loadingItem, setLoadingItem] = useState(true);
  const [loadingStates, setLoadingStates] = useState(true);
  const [showAddStateModal, setShowAddStateModal] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    const fetchData = async () => {
      try {
        const i = await getItem(itemId);
        setItem(i);
      } catch (e) {
        setItem(null);
      } finally {
        setLoadingItem(false);
      }
    };
    fetchData();
  }, [itemId]);

  useEffect(() => {
    if (!itemId) return;
    const fetchStates = async () => {
      try {
        const s = await getStatesByItem(itemId);
        setStates(s);
      } catch (e) {
        setStates([]);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, [itemId]);

  const handleAddState = () => {
    setShowAddStateModal(true);
  };

  if (loadingItem) {
    return (
      <Container fluid className="operator-page text-center py-5" role="status" aria-live="polite" aria-label={t('loadingDetails')}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (!item) {
    return (
      <Container fluid className="operator-page text-center py-5" role="region" aria-label={t('productNotFound')}>
        <p>{t('productNotFound')}</p>
        <Button variant="outline-secondary" onClick={() => router.push('/operator')}>
          {tCommon('back')}
        </Button>
      </Container>
    );
  }

  return (
    <Container fluid className="operator-page" role="main" aria-label={t('productDetails')}>
      <Row className="mb-3" role="region" aria-label="Acciones de navegación y creación de estado">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button variant="outline-secondary" onClick={() => router.push('/operator')} className="me-2 icon-button-mobile" aria-label={t('backToList')}>
                <i className="bi bi-arrow-left me-md-2"></i>
                <span className="d-none d-md-inline">{tCommon('back')}</span>
              </Button>
            </div>
            <div className="d-flex gap-2">
              <Button variant="primary" onClick={handleAddState} className="icon-button-mobile" aria-label={t('addState')}>
                <i className="bi bi-plus-circle me-md-2"></i>
                <span className="d-none d-md-inline">{t('addState')}</span>
              </Button>
            </div>
          </div>
        </Col>
      </Row>


      <Row className="mb-4">
        <Col>
          <Box>
            <BoxHeader title={t('productDetails')} />
            <div className="item-details">
              <Row>
                <Col md={6}>
                  <div className="item-info">
                    <div className="info-row">
                      <span className="info-label">{tTables('columnLabels.name')}:</span>
                      <span className="info-value">{item.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{t('description')}:</span>
                      <span className="info-value">{item.description || '-'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{tTables('columnLabels.category')}:</span>
                      <span className="info-value">{item.categoryName || item.category?.name || item.categoryId}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{tTables('columnLabels.creationDate')}:</span>
                      <span className="info-value">
                        {formatValueWithSmartDateDetection(item.createdAt, 'createdAt')}
                      </span>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="item-image-section">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="img-fluid rounded"
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="no-image-placeholder">
                        <span>📦</span>
                        <p>-</p>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          </Box>
        </Col>
      </Row>

      {/* Modal para agregar estado (mobile-first) */}
      {item && (
        <AddStateForm
          item={item}
          show={showAddStateModal}
          onHide={() => setShowAddStateModal(false)}
          onSuccess={async () => {
            setShowAddStateModal(false);
            try {
              setLoadingStates(true);
              const s = await getStatesByItem(itemId);
              setStates(s);
            } finally {
              setLoadingStates(false);
            }
          }}
        />
      )}

      <Row>
        <Col>
          <Box>
            <BoxHeader title={t('digitalPassport')} />
            {loadingStates ? (
              <div className="text-center py-4">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">{t('loadingStates')}</p>
              </div>
            ) : states.length > 0 ? (
              <Timeline
                items={convertStatesToTimeline(states)}
                showDownloadButton={true}
                showEvidenceLink={true}
                className="px-0"
              />
            ) : (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-clock-history fs-1 mb-3 d-block"></i>
                <p>{t('noStates')}</p>
              </div>
            )}
          </Box>
        </Col>
      </Row>
    </Container>
  );
}



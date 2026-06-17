'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button, Table, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { listWebhooks } from '@/actions/webhooks/list';
import { createWebhook } from '@/actions/webhooks/create';
import { updateWebhook } from '@/actions/webhooks/update';
import { deleteWebhook } from '@/actions/webhooks/delete';
import { toggleWebhookActive } from '@/actions/webhooks/toggleActive';
import Box from '@/components/Box';
import LoadingOverlay from '@/components/Loading';
import { Divider } from '@/components/Divider';
import '@/components/GenericTable/Toolbar/Toolbar.css';
import { colors, axisProps, gridProps, tooltipStyle } from '@/components/charts/theme';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  headers: Record<string, string> | null;
  lastTriggeredAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  failureCount: number;
  createdAt: Date;
}

export default function WebhooksPageClient() {
  const t = useTranslations('developer.webhooks');
  const tCommon = useTranslations('common.actions');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as string[],
    active: true,
    headers: '',
  });

  const availableEvents = [
    'item.created',
    'state.created',
    'energy_source_event',
    'energy_consumption_event',
    'co2_emission_event',
    'co2_certification_event',
    'maintenance_event',
  ];

  const loadWebhooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listWebhooks();
      if (result.success && result.data) {
        setWebhooks(result.data);
      } else {
        const errorMsg = result.error || t('loadError');
        console.error('Error loading webhooks:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || t('loadError');
      console.error('Exception loading webhooks:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      let headersObj = null;
      if (formData.headers.trim()) {
        try {
          headersObj = JSON.parse(formData.headers);
        } catch {
          setError(t('headersInvalid'));
          return;
        }
      }

      const result = await createWebhook({
        name: formData.name,
        url: formData.url,
        secret: formData.secret || null,
        events: formData.events,
        active: formData.active,
        headers: headersObj,
      });

      if (result.success) {
        setSuccess(t('createSuccess'));
        setShowCreateModal(false);
        resetForm();
        await loadWebhooks();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || t('createError'));
      }
    } catch (err) {
      setError(t('createError'));
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: '',
      events: webhook.events,
      active: webhook.active,
      headers: webhook.headers ? JSON.stringify(webhook.headers, null, 2) : '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWebhook) return;

    setError(null);
    setSuccess(null);

    try {
      let headersObj = null;
      if (formData.headers.trim()) {
        try {
          headersObj = JSON.parse(formData.headers);
        } catch {
          setError(t('headersInvalid'));
          return;
        }
      }

      const result = await updateWebhook(editingWebhook.id, {
        name: formData.name,
        url: formData.url,
        secret: formData.secret || null,
        events: formData.events,
        active: formData.active,
        headers: headersObj,
      });

      if (result.success) {
        setSuccess(t('updateSuccess'));
        setShowEditModal(false);
        setEditingWebhook(null);
        resetForm();
        await loadWebhooks();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || t('updateError'));
      }
    } catch (err) {
      setError(t('updateError'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    try {
      const result = await deleteWebhook(id);
      if (result.success) {
        setSuccess(t('deleteSuccess'));
        await loadWebhooks();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || t('deleteError'));
      }
    } catch (err) {
      setError(t('deleteError'));
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const result = await toggleWebhookActive(id, !currentActive);
      if (result.success) {
        const status = !currentActive ? t('activated') : t('deactivated');
        setSuccess(t('toggleSuccess', { status }));
        await loadWebhooks();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || t('toggleError'));
      }
    } catch (err) {
      setError(t('toggleError'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      secret: '',
      events: [],
      active: true,
      headers: '',
    });
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return t('never');
    const locale = typeof window !== 'undefined' ? navigator.language : 'en-US';
    return new Date(date).toLocaleString(locale);
  };

  // Preparar datos para el gráfico de evolución de triggers de webhooks
  const chartData = useMemo(() => {
    if (webhooks.length === 0) return { data: [], webhookNames: [] };

    const now = new Date();
    const sortedWebhooks = [...webhooks].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Obtener la fecha más antigua
    const oldestDate = new Date(sortedWebhooks[0].createdAt);
    oldestDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Crear períodos (semanas si hay más de 30 días, días si hay menos)
    const periodType = daysDiff > 30 ? 'week' : 'day';
    const periods: Array<{ period: string; date: Date; endDate: Date }> = [];

    const startDate = new Date(oldestDate);
    let periodNum = 1;
    
    while (startDate <= now) {
      const locale = typeof window !== 'undefined' ? navigator.language : 'en-US';
      const key = periodType === 'week' 
        ? `Sem ${periodNum}`
        : startDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
      
      const endDate = periodType === 'week'
        ? new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      
      periods.push({ period: key, date: new Date(startDate), endDate });
      
      if (periodType === 'week') {
        startDate.setDate(startDate.getDate() + 7);
        periodNum++;
      } else {
        startDate.setDate(startDate.getDate() + 1);
      }
    }

    // Mostrar si cada webhook se disparó en cada período
    const result = periods.map(({ period, date, endDate }) => {
      const periodData: { period: string; [key: string]: number | string } = { period };

      sortedWebhooks.forEach((webhook, index) => {
        const webhookCreated = new Date(webhook.createdAt);
        const webhookKey = `webhook_${index}`;
        
        // Si el webhook fue creado antes o en este período
        if (webhookCreated <= endDate) {
          // Verificar si el webhook se disparó en este período
          if (webhook.lastTriggeredAt) {
            const triggerDate = new Date(webhook.lastTriggeredAt);
            // Si se disparó en este período, mostrar 1, sino 0
            periodData[webhookKey] = (triggerDate >= date && triggerDate < endDate) ? 1 : 0;
          } else {
            // Webhook creado pero nunca disparado
            periodData[webhookKey] = 0;
          }
        } else {
          // Webhook aún no creado en este período
          periodData[webhookKey] = 0;
        }
      });

      return periodData;
    });

    // Obtener nombres de webhooks para la leyenda
    const webhookNames = sortedWebhooks.map((webhook, index) => ({
      key: `webhook_${index}`,
      name: webhook.name
    }));

    return { data: result, webhookNames };
  }, [webhooks]);

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <>
      <Box>
        <h6 className="mb-2">{t('whatAreWebhooks')}</h6>
        <Divider />
        <p className="mb-0 text-muted">
          {t('webhooksDescription')}
        </p>
      </Box>

      <Box>
        <div className="table-toolbar">
          <div className="title-section">
            <i className="bi bi-box-arrow-up-right-fill"></i>
            <h4>{t('title')}</h4>
          </div>
          <div className="controls-section">
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <span className="d-none d-md-inline">{t('createWebhook')}</span>
              <span className="d-md-none">+</span>
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)} dismissible className="mb-3">
            {success}
          </Alert>
        )}

        <Divider />

        {webhooks.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-box-arrow-up-right" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
            <p className="mt-3 text-muted">{t('noWebhooks')}</p>
          </div>
        ) : (
          <Table responsive striped className="custom-table">
            <thead>
              <tr>
                <th>{t('table.name')}</th>
                <th>{t('table.url')}</th>
                <th>{t('table.events')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.lastExecution')}</th>
                <th>{t('table.failures')}</th>
                <th>{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id}>
                  <td>{webhook.name}</td>
                  <td>
                    <code className="text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                      {webhook.url}
                    </code>
                  </td>
                  <td>
                    {webhook.events.map(event => (
                      <Badge key={event} bg="secondary" className="me-1">
                        {event}
                      </Badge>
                    ))}
                  </td>
                  <td>
                    {webhook.active ? (
                      <Badge bg="success">{t('active')}</Badge>
                    ) : (
                      <Badge bg="secondary">{t('inactive')}</Badge>
                    )}
                  </td>
                  <td>
                    {webhook.lastTriggeredAt ? (
                      <div>
                        <div>{formatDate(webhook.lastTriggeredAt)}</div>
                        <small className={webhook.lastSuccessAt ? 'text-success' : 'text-danger'}>
                          {webhook.lastSuccessAt ? t('success') : t('error')}
                        </small>
                      </div>
                    ) : (
                      t('never')
                    )}
                  </td>
                  <td>
                    {webhook.failureCount > 0 ? (
                      <Badge bg="danger">{webhook.failureCount}</Badge>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-1"
                      onClick={() => handleEdit(webhook)}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button
                      variant={webhook.active ? 'outline-warning' : 'outline-success'}
                      size="sm"
                      className="me-1"
                      onClick={() => handleToggleActive(webhook.id, webhook.active)}
                    >
                      <i className={`bi ${webhook.active ? 'bi-pause' : 'bi-play'}`}></i>
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(webhook.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Box>

      {webhooks.length > 0 && chartData.data.length > 0 && (
        <Box>
          <div className="table-toolbar">
            <div className="title-section">
              <i className="bi bi-graph-up"></i>
              <h4>{t('triggersEvolution')}</h4>
            </div>
          </div>
          <Divider />
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="period" {...axisProps} />
              <YAxis 
                {...axisProps} 
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={(value) => value === 1 ? t('triggered') : t('notTriggered')}
              />
              <Tooltip 
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => {
                  const webhookIndex = parseInt(name.replace('webhook_', ''));
                  const webhookName = chartData.webhookNames[webhookIndex]?.name || name;
                  return [value === 1 ? t('triggered') : t('notTriggered'), webhookName];
                }}
                labelFormatter={(label) => `${t('period')} ${label}`}
              />
              <Legend 
                formatter={(value) => {
                  const webhookIndex = parseInt(value.replace('webhook_', ''));
                  return chartData.webhookNames[webhookIndex]?.name || value;
                }}
              />
              {chartData.webhookNames.map((webhook, index) => {
                const webhookKey = webhook.key;
                const hue = (index * 137.508) % 360;
                const color = `hsl(${hue}, 70%, 50%)`;
                
                return (
                  <Line 
                    key={webhookKey}
                    type="monotone" 
                    dataKey={webhookKey}
                    stroke={color}
                    strokeWidth={2}
                    name={webhookKey}
                    dot={{ fill: color, strokeWidth: 2, r: 3 }}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={() => { setShowCreateModal(false); resetForm(); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('createModal.title')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>{t('createModal.nameLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder={t('createModal.namePlaceholder')}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('createModal.urlLabel')}</Form.Label>
              <Form.Control
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                required
                placeholder={t('createModal.urlPlaceholder')}
              />
              <Form.Text className="text-muted">
                {t('createModal.urlHelp')}
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('createModal.eventsLabel')}</Form.Label>
              <div>
                {availableEvents.map(event => (
                  <Form.Check
                    key={event}
                    type="checkbox"
                    id={`create-${event}`}
                    label={event}
                    checked={formData.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                ))}
              </div>
              <Form.Text className="text-muted">
                {t('createModal.eventsHelp')}
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('createModal.secretLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={formData.secret}
                onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                placeholder={t('createModal.secretPlaceholder')}
              />
              <Form.Text className="text-muted">
                {t('createModal.secretHelp')}
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('createModal.headersLabel')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.headers}
                onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
                placeholder={t('createModal.headersPlaceholder')}
              />
              <Form.Text className="text-muted">
                {t('createModal.headersHelp')}
              </Form.Text>
            </Form.Group>
            <Form.Check
              type="switch"
              id="create-active"
              label={t('createModal.activeLabel')}
              checked={formData.active}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              {t('createModal.cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {t('createModal.create')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); setEditingWebhook(null); resetForm(); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('editModal.title')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdate}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>{t('editModal.nameLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('editModal.urlLabel')}</Form.Label>
              <Form.Control
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('editModal.eventsLabel')}</Form.Label>
              <div>
                {availableEvents.map(event => (
                  <Form.Check
                    key={event}
                    type="checkbox"
                    id={`edit-${event}`}
                    label={event}
                    checked={formData.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                ))}
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('editModal.secretLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={formData.secret}
                onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                placeholder={t('editModal.secretPlaceholder')}
              />
              <Form.Text className="text-muted">
                {t('editModal.secretHelp')}
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('editModal.headersLabel')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.headers}
                onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
              />
            </Form.Group>
            <Form.Check
              type="switch"
              id="edit-active"
              label={t('editModal.activeLabel')}
              checked={formData.active}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditingWebhook(null); resetForm(); }}>
              {t('editModal.cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {t('editModal.save')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}


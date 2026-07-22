'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Card, Spinner, Table, Dropdown, Modal, Button } from '@/components/legacy/bootstrap-compat';
import { listSupportMessages } from '@/actions/support-messages/list';
import { updateSupportMessageStatus } from '@/actions/support-messages/updateStatus';
import { deleteSupportMessage } from '@/actions/support-messages/delete';
import type { SupportMessageListItem, SupportMessageStatus } from '@/domain/support-messages/types';

const STATUS_CONFIG: Record<SupportMessageStatus, { label: string; bg: string }> = {
  pending: { label: 'Pendiente', bg: 'warning' },
  read: { label: 'Leído', bg: 'info' },
  resolved: { label: 'Resuelto', bg: 'success' },
};

export default function SupportMessagesPanel() {
  const [messages, setMessages] = useState<SupportMessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessageListItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await listSupportMessages();
      setMessages(data as SupportMessageListItem[]);
    } catch (error) {
      console.error('Error loading support messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: SupportMessageStatus) => {
    try {
      await updateSupportMessageStatus(id, status);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m))
      );
      if (selectedMessage?.id === id) {
        setSelectedMessage((prev) => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSupportMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const pendingCount = messages.filter((m) => m.status === 'pending').length;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-chat-dots me-2"></i>
          Mensajes de Soporte
          {pendingCount > 0 && (
            <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: '0.6em' }}>
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </h2>
      </div>

      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-inbox me-2"></i>
            Todos los mensajes ({messages.length})
          </h5>
          {loading && <Spinner size="sm" />}
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner />
              <p className="mt-2 text-muted">Cargando mensajes...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-inbox fs-1 text-muted"></i>
              <p className="mt-3 text-muted">No hay mensajes de soporte</p>
            </div>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Organización</th>
                  <th>Asunto</th>
                  <th>Página</th>
                  <th className="text-center">Estado</th>
                  <th>Fecha</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => {
                  const statusConf = STATUS_CONFIG[msg.status];
                  return (
                    <tr
                      key={msg.id}
                      style={{ cursor: 'pointer' }}
                      className={msg.status === 'pending' ? 'table-warning' : ''}
                      onClick={() => {
                        setSelectedMessage(msg);
                        if (msg.status === 'pending') {
                          handleStatusChange(msg.id, 'read');
                        }
                      }}
                    >
                      <td className="text-center">
                        {msg.status === 'pending' && (
                          <i className="bi bi-circle-fill text-warning" style={{ fontSize: '0.5rem' }}></i>
                        )}
                      </td>
                      <td>
                        <strong>{msg.organizationName || '-'}</strong>
                      </td>
                      <td>{msg.subject}</td>
                      <td>
                        {msg.page ? (
                          <code className="small text-muted">{msg.page}</code>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-center">
                        <Badge bg={statusConf.bg} text={statusConf.bg === 'warning' ? 'dark' : undefined}>
                          {statusConf.label}
                        </Badge>
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(msg.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </small>
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Dropdown>
                          <Dropdown.Toggle variant="outline-secondary" size="sm">
                            <i className="bi bi-three-dots"></i>
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            <Dropdown.Header>Cambiar estado</Dropdown.Header>
                            {(Object.entries(STATUS_CONFIG) as [SupportMessageStatus, { label: string; bg: string }][]).map(
                              ([status, conf]) => (
                                <Dropdown.Item
                                  key={status}
                                  active={msg.status === status}
                                  onClick={() => handleStatusChange(msg.id, status)}
                                >
                                  <Badge bg={conf.bg} text={conf.bg === 'warning' ? 'dark' : undefined} className="me-2">
                                    {conf.label}
                                  </Badge>
                                </Dropdown.Item>
                              )
                            )}
                            <Dropdown.Divider />
                            <Dropdown.Item
                              className="text-danger"
                              onClick={() => setShowDeleteConfirm(msg.id)}
                            >
                              <i className="bi bi-trash me-2"></i>
                              Eliminar
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Message detail modal */}
      <Modal show={!!selectedMessage} onHide={() => setSelectedMessage(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-envelope-open me-2"></i>
            {selectedMessage?.subject}
          </Modal.Title>
        </Modal.Header>
        {selectedMessage && (
          <Modal.Body>
            <div className="d-flex gap-3 mb-3 flex-wrap">
              <div>
                <small className="text-muted">Organización</small>
                <div><strong>{selectedMessage.organizationName || '-'}</strong></div>
              </div>
              <div>
                <small className="text-muted">Página</small>
                <div><code>{selectedMessage.page || '-'}</code></div>
              </div>
              <div>
                <small className="text-muted">Fecha</small>
                <div>
                  {new Date(selectedMessage.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div>
                <small className="text-muted">Estado</small>
                <div>
                  <Badge
                    bg={STATUS_CONFIG[selectedMessage.status].bg}
                    text={STATUS_CONFIG[selectedMessage.status].bg === 'warning' ? 'dark' : undefined}
                  >
                    {STATUS_CONFIG[selectedMessage.status].label}
                  </Badge>
                </div>
              </div>
            </div>
            <hr />
            <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap' }}>
              {selectedMessage.message}
            </div>
          </Modal.Body>
        )}
        <Modal.Footer>
          {selectedMessage && selectedMessage.status !== 'resolved' && (
            <Button
              variant="success"
              onClick={() => handleStatusChange(selectedMessage.id, 'resolved')}
            >
              <i className="bi bi-check-circle me-1"></i>
              Marcar como resuelto
            </Button>
          )}
          <Button variant="secondary" onClick={() => setSelectedMessage(null)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal show={!!showDeleteConfirm} onHide={() => setShowDeleteConfirm(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Estás seguro de que deseas eliminar este mensaje? Esta acción no se puede deshacer.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
          >
            <i className="bi bi-trash me-1"></i>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

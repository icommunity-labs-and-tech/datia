'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, Form, Alert, Spinner, Card, Row, Col, Badge, Table } from '@/components/legacy/bootstrap-compat';
import { createOrganizationWithAdmin, listOrganizations, type OrganizationListItem } from '@/actions/organizations';
import { listSectors, type SectorListItem } from '@/actions/sectors';
import Box from '@/components/Box';

interface OrganizationsPanelProps {
  title?: string;
  showBox?: boolean;
}

export default function OrganizationsPanel({ 
  title = "Gestión de Organizaciones", 
  showBox = true 
}: OrganizationsPanelProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [sectors, setSectors] = useState<SectorListItem[]>([]);

  const [formData, setFormData] = useState({
    organizationName: '',
    sectorId: '',
    adminName: '',
    adminEmail: '',
    language: 'es' as 'es' | 'en',
  });

  useEffect(() => {
    loadOrganizations();
    listSectors().then(setSectors).catch(console.error);
  }, []);

  const loadOrganizations = async () => {
    setLoadingList(true);
    try {
      const result = await listOrganizations();
      if (result.success && result.organizations) {
        setOrganizations(result.organizations);
      } else {
        setError(result.error || 'Error al cargar organizaciones');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoadingList(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createOrganizationWithAdmin({
        nombre: formData.organizationName,
        sectorId: formData.sectorId || undefined,
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        language: formData.language,
      });

      if (result.success) {
        const successMessage = `¡Organización "${result.organization?.nombre}" creada exitosamente!\n` +
          `Administrador: ${result.admin?.email}\n` +
          `Se ha enviado automáticamente un email de invitación al administrador.`;
        
        setSuccess(successMessage);
        setFormData({
          organizationName: '',
          sectorId: '',
          adminName: '',
          adminEmail: '',
          language: 'es',
        });
        setShowCreateModal(false); // Cerrar modal tras éxito
        await loadOrganizations(); // Recargar lista
      } else {
        setError(result.error || 'Error al crear la organización');
        // No cerrar el modal para que el usuario vea el error
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      // No cerrar el modal para que el usuario vea el error
    } finally {
      setLoading(false);
    }
  };


  const content = (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{title}</h2>
        <div>
          <Button 
            variant="outline-info" 
            onClick={() => setShowHelpModal(true)}
            className="me-2"
          >
            <i className="bi bi-question-circle me-2"></i>
            ¿Cómo funciona?
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowCreateModal(true)}
          >
            <i className="bi bi-building-add me-2"></i>
            Nueva Organización
          </Button>
        </div>
      </div>

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          <div className="d-flex align-items-start">
            <i className="bi bi-check-circle-fill fs-4 me-3 text-success"></i>
            <div className="flex-grow-1">
              <strong>¡Organización creada exitosamente!</strong>
              <pre className="mb-0 mt-2" style={{ whiteSpace: 'pre-wrap' }}>{success}</pre>
              <Alert variant="success" className="mt-3 mb-0">
                <i className="bi bi-envelope-check me-2"></i>
                <strong>Email enviado:</strong> Se ha enviado automáticamente un email de activación al administrador.
              </Alert>
            </div>
          </div>
        </Alert>
      )}

      {/* Lista de Organizaciones */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-building me-2"></i>
            Organizaciones Registradas
          </h5>
          {loadingList && <Spinner size="sm" />}
        </Card.Header>
        <Card.Body>
          {loadingList ? (
            <div className="text-center py-4">
              <Spinner />
              <p className="mt-2 text-muted">Cargando organizaciones...</p>
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-inbox fs-1 text-muted"></i>
              <p className="mt-3 text-muted">No hay organizaciones registradas</p>
              <Button 
                variant="primary" 
                onClick={() => setShowCreateModal(true)}
                className="mt-2"
              >
                <i className="bi bi-building-add me-2"></i>
                Crear Primera Organización
              </Button>
            </div>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Sector</th>
                  <th>Plan</th>
                  <th className="text-center">Usuarios</th>
                  <th className="text-center">Items</th>
                  <th className="text-center">Estados</th>
                  <th className="text-center">Admin Activado</th>
                  <th className="text-center">Usuarios Activos</th>
                  <th>Fecha Creación</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr 
                    key={org.id}
                    style={{ cursor: 'pointer' }}
                    onDoubleClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                    title="Doble clic para ver detalles"
                  >
                    <td>
                      <strong>{org.nombre}</strong>
                    </td>
                    <td>
                      <code className="text-muted">{org.slug}</code>
                    </td>
                    <td>
                      {org.sectorName ? (
                        <Badge bg="info">{org.sectorName}</Badge>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <Badge bg="secondary">{org.plan}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg="info">{org.userCount}</Badge>
                      {org.pendingUsersCount > 0 && (
                        <small className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
                          {org.pendingUsersCount} pendiente{org.pendingUsersCount !== 1 ? 's' : ''}
                        </small>
                      )}
                    </td>
                    <td className="text-center">
                      <Badge bg="primary">{org.itemCount}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg="warning" text="dark">{org.stateCount}</Badge>
                    </td>
                    <td className="text-center">
                      {org.adminActivated ? (
                        <Badge bg="success">
                          <i className="bi bi-check-circle me-1"></i>
                          Sí
                        </Badge>
                      ) : (
                        <Badge bg="warning" text="dark">
                          <i className="bi bi-clock me-1"></i>
                          Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="text-center">
                      <Badge bg="success">{org.activeUsersCount}</Badge>
                    </td>
                    <td>
                      <small className="text-muted">
                        {new Date(org.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Row className="g-3">
        <Col md={12}>
          <Card className="border-primary">
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <i className="bi bi-info-circle-fill fs-4 text-primary me-3"></i>
                <div>
                  <h5 className="mb-1">Sistema Multi-Tenancy</h5>
                  <p className="text-muted mb-0">Cada organización tiene sus propios datos aislados</p>
                </div>
              </div>
              <p className="mb-2">
                <strong>¿Qué es una organización?</strong> Una organización representa una empresa, cliente o grupo independiente 
                que usa Datia. Cada organización tiene sus propios usuarios, categorías, items y datos completamente aislados.
              </p>
              <p className="mb-0">
                <strong>Ejemplo:</strong> Si creas la organización &quot;Acme Corp&quot;, todos sus usuarios solo verán y gestionarán 
                los items de Acme Corp, sin poder acceder a datos de otras organizaciones.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de Ayuda */}
      <Modal show={showHelpModal} onHide={() => setShowHelpModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-question-circle me-2"></i>
            Guía: Crear una Organización
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <strong>¿Qué vas a hacer?</strong> Crear una nueva organización (empresa/cliente) con su primer administrador.
          </Alert>

          <h5 className="mt-4 mb-3">📝 Paso a Paso</h5>

          <Card className="mb-3">
            <Card.Body>
              <Badge bg="primary" className="mb-2">Paso 1</Badge>
              <h6>Ingresa el nombre de la organización</h6>
              <p className="text-muted mb-2">
                <strong>Ejemplo:</strong> &quot;Acme Corporation&quot;, &quot;Hospital San José&quot;, &quot;Tienda El Punto&quot;
              </p>
              <p className="mb-0">
                Este es el nombre que verán los usuarios. El identificador único se generará automáticamente.
              </p>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <Badge bg="primary" className="mb-2">Paso 2</Badge>
              <h6>Asigna el primer administrador</h6>
              <p className="text-muted mb-2">
                <strong>Ejemplo:</strong> Juan Pérez (juan.perez@acme.com)
              </p>
              <p className="mb-0">
                Esta persona será el administrador inicial y podrá invitar más usuarios.
              </p>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <Badge bg="success" className="mb-2">Paso 3</Badge>
              <h6>Envía el link de activación</h6>
              <p className="text-muted mb-2">
                Después de crear la organización, se genera un <strong>link único de activación</strong>.
              </p>
              <p className="mb-0">
                <strong>Email automático:</strong> El sistema enviará automáticamente un email de invitación al administrador
                con un link de activación. Con ese link podrá establecer su contraseña y acceder al sistema.
              </p>
            </Card.Body>
          </Card>

          <Alert variant="success" className="mt-4">
            <strong>✅ Email automático:</strong> El sistema enviará automáticamente un email de invitación 
            al administrador con el link de activación. No necesitas hacer nada más.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHelpModal(false)}>
            Cerrar
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowHelpModal(false);
              setShowCreateModal(true);
            }}
          >
            Entendido, crear organización
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Creación */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-building-add me-2"></i>
            Crear Nueva Organización
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <Alert variant="info" className="mb-4">
              <strong>💡 Tip:</strong> Completa todos los campos. El sistema creará la organización 
              y un usuario administrador simultáneamente.
            </Alert>

            <Card className="mb-4">
              <Card.Header className="bg-primary text-white">
                <strong>1. Datos de la Organización</strong>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Nombre de la Organización *
                    <i className="bi bi-info-circle ms-2 text-muted" title="Nombre completo de la empresa o cliente"></i>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: Acme Corporation"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    required
                  />
                  <Form.Text className="text-muted">
                    Nombre completo de la empresa o cliente. El identificador único se generará automáticamente.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Sector *
                    <i className="bi bi-info-circle ms-2 text-muted" title="Sector de actividad de la organización"></i>
                  </Form.Label>
                  <Form.Select
                    value={formData.sectorId}
                    onChange={(e) => setFormData({ ...formData, sectorId: e.target.value })}
                    required
                  >
                    <option value="">Selecciona un sector...</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    El sector determina los ejemplos que se mostrarán en el tutorial del dashboard.
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header className="bg-success text-white">
                <strong>2. Primer Administrador</strong>
              </Card.Header>
              <Card.Body>
                <Alert variant="warning" className="mb-3">
                  <small>
                    <strong>Importante:</strong> Este usuario será <Badge bg="warning" text="dark">ADMIN</Badge> de la organización 
                    y podrá invitar más usuarios.
                  </small>
                </Alert>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Nombre Completo *
                    <i className="bi bi-info-circle ms-2 text-muted" title="Nombre del administrador"></i>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Email del Administrador *
                    <i className="bi bi-info-circle ms-2 text-muted" title="Email válido para activación"></i>
                  </Form.Label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-envelope"></i>
                    </span>
                    <Form.Control
                      type="email"
                      placeholder="Ej: juan.perez@acme.com"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      required
                    />
                  </div>
                  <Form.Text className="text-muted">
                    Se enviará automáticamente un email de invitación con el link de activación.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Idioma del Email
                    <i className="bi bi-info-circle ms-2 text-muted" title="Idioma en que se enviará el email de invitación"></i>
                  </Form.Label>
                  <Form.Select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value as 'es' | 'en' })}
                  >
                    <option value="es">🇪🇸 Español</option>
                    <option value="en">🇬🇧 English</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    El email de invitación se enviará en este idioma.
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)} className="mt-4 mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Error:</strong> {error}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              <i className="bi bi-x-circle me-2"></i>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Creando organización...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Crear Organización y Administrador
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );

  if (!showBox) {
    return content;
  }

  return <Box>{content}</Box>;
}



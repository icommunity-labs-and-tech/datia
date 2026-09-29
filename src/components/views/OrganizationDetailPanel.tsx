'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card, Row, Col, Badge, Spinner, Alert, Table, Modal } from '@/components/legacy/bootstrap-compat';
import Link from 'next/link';
import { getOrganizationById, deleteOrganization, type OrganizationDetail } from '@/actions/organizations';
import { updateOrgModules } from '@/actions/organizations/update-modules';
import { listCompaniesForOrganization } from '@/actions/companies/superadmin';
import type { CompanySummary } from '@/actions/companies/list';
import Box from '@/components/Box';

interface OrganizationDetailPanelProps {
  organizationId: string;
}

export default function OrganizationDetailPanel({ organizationId }: OrganizationDetailPanelProps) {
  const t = useTranslations('superadminOrganization.companies');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [savingModules, setSavingModules] = useState(false);

  useEffect(() => {
    loadOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const loadOrganization = async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, companyList] = await Promise.all([
        getOrganizationById(organizationId),
        listCompaniesForOrganization(organizationId),
      ]);
      if (result.success && result.organization) {
        setOrganization(result.organization);
        setCompanies(companyList);
      } else {
        setError(result.error || 'Error al cargar la organización');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    
    setDeleting(true);
    setDeleteError(null);
    
    try {
      const result = await deleteOrganization(organization.id);
      if (result.success) {
        // Redirigir a la lista de organizaciones después de eliminar
        router.push('/superadmin/organizations');
      } else {
        setDeleteError(result.error || 'Error al eliminar la organización');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <div className="text-center py-5">
          <Spinner />
          <p className="mt-3 text-muted">Cargando detalles de la organización...</p>
        </div>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={() => router.push('/superadmin/organizations')}>
            Volver a organizaciones
          </Button>
        </Alert>
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box>
        <Alert variant="warning">
          <Alert.Heading>Organización no encontrada</Alert.Heading>
          <Button variant="outline-warning" onClick={() => router.push('/superadmin/organizations')}>
            Volver a organizaciones
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="bi bi-building me-2"></i>
          {organization.name}
        </h2>
        <div className="d-flex gap-2">
          <Button 
            variant="danger" 
            onClick={() => setShowDeleteModal(true)}
          >
            <i className="bi bi-trash me-2"></i>
            Eliminar Organización
          </Button>
          <Button 
            variant="outline-secondary" 
            onClick={() => router.push('/superadmin/organizations')}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Volver
          </Button>
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col md={6} lg={3}>
          <Card className="border-primary h-100">
            <Card.Body className="text-center">
              <i className="bi bi-people text-primary" style={{ fontSize: '2rem' }}></i>
              <h3 className="mt-2 mb-0">{organization.userCount}</h3>
              <p className="text-muted mb-0">Usuarios</p>
              <small className="text-muted">
                {organization.activeUsersCount} activos, {organization.pendingUsersCount} pendientes
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="border-success h-100">
            <Card.Body className="text-center">
              <i className="bi bi-box-seam text-success" style={{ fontSize: '2rem' }}></i>
              <h3 className="mt-2 mb-0">{organization.itemCount}</h3>
              <p className="text-muted mb-0">Items</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="border-warning h-100">
            <Card.Body className="text-center">
              <i className="bi bi-list-check text-warning" style={{ fontSize: '2rem' }}></i>
              <h3 className="mt-2 mb-0">{organization.certificationCount}</h3>
              <p className="text-muted mb-0">Certificaciones</p>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      <Row className="g-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Información General
              </h5>
            </Card.Header>
            <Card.Body>
              <Table borderless className="mb-0">
                <tbody>
                  <tr>
                    <td><strong>Nombre:</strong></td>
                    <td>{organization.name}</td>
                  </tr>
                  <tr>
                    <td><strong>Slug:</strong></td>
                    <td><code>{organization.slug}</code></td>
                  </tr>
                  <tr>
                    <td><strong>Estado:</strong></td>
                    <td>
                      {organization.active ? (
                        <Badge bg="success">Activa</Badge>
                      ) : (
                        <Badge bg="secondary">Inactiva</Badge>
                      )}
                    </td>
                  </tr>
                  {organization.domain && (
                    <tr>
                      <td><strong>Dominio:</strong></td>
                      <td><code>{organization.domain}</code></td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>Creada:</strong></td>
                    <td>
                      {new Date(organization.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Actualizada:</strong></td>
                    <td>
                      {new Date(organization.updatedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-person-gear me-2"></i>
                Administrador Principal
              </h5>
            </Card.Header>
            <Card.Body>
              {organization.adminName ? (
                <>
                  <p className="mb-2">
                    <strong>Nombre:</strong> {organization.adminName}
                  </p>
                  <p className="mb-2">
                    <strong>Email:</strong> {organization.adminEmail}
                  </p>
                  <p className="mb-0">
                    <strong>Estado de activación:</strong>{' '}
                    {organization.adminActivated ? (
                      <Badge bg="success">
                        <i className="bi bi-check-circle me-1"></i>
                        Activado
                      </Badge>
                    ) : (
                      <Badge bg="warning" text="dark">
                        <i className="bi bi-clock me-1"></i>
                        Pendiente de activación
                      </Badge>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-muted mb-0">No se encontró un administrador principal</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Empresas */}
      <Card className="mt-3">
        <Card.Header>
          <h5 className="mb-0"><i className="bi bi-buildings me-2" />{t('title')}</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {companies.length === 0 ? (
            <p className="text-muted p-3 mb-0">{t('empty')}</p>
          ) : (
            <Table className="mb-0" hover responsive>
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th className="text-end">{t('assets')}</th>
                  <th className="text-end">{t('accounts')}</th>
                  <th>{t('created')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <Link href={`/superadmin/organizations/${organizationId}/companies/${company.id}`}>
                        {company.name}
                      </Link>
                    </td>
                    <td className="text-end">{company.assets}</td>
                    <td className="text-end">{company.accounts}</td>
                    <td>{new Date(company.createdAt).toLocaleDateString('es-ES')}</td>
                    <td>
                      {company.active ? (
                        <Badge bg="success">{t('active')}</Badge>
                      ) : (
                        <Badge bg="secondary">{t('inactive')}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Módulos */}
      <Card className="mt-3">
        <Card.Header>
          <h5 className="mb-0"><i className="bi bi-puzzle me-2" />Módulos</h5>
        </Card.Header>
        <Card.Body>
          {(['passport', 'energy'] as const).map((mod) => {
            const modules = organization.settings?.modules ?? {};
            const defaultOn = mod === 'passport';
            const enabled = modules[mod] !== undefined ? modules[mod] : defaultOn;
            return (
              <div key={mod} className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id={`module-${mod}`}
                  checked={enabled}
                  disabled={savingModules}
                  onChange={async (e) => {
                    setSavingModules(true);
                    await updateOrgModules(organization.id, { [mod]: e.target.checked });
                    await loadOrganization();
                    setSavingModules(false);
                  }}
                />
                <label className="form-check-label" htmlFor={`module-${mod}`}>
                  {mod === 'passport' ? '📄 Pasaporte Digital (DPP)' : '⚡ Certificación Energética (ESPR)'}
                </label>
              </div>
            );
          })}
        </Card.Body>
      </Card>

      {/* Modal de confirmación de eliminación */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle text-danger me-2"></i>
            Confirmar Eliminación
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError && (
            <Alert variant="danger" dismissible onClose={() => setDeleteError(null)}>
              {deleteError}
            </Alert>
          )}
          <p>
            ¿Estás seguro de que deseas eliminar la organización <strong>&quot;{organization.name}&quot;</strong>?
          </p>
          <Alert variant="warning" className="mb-0">
            <strong>⚠️ Advertencia:</strong> Esta acción es irreversible y eliminará permanentemente:
            <ul className="mb-0 mt-2">
              <li>Todos los usuarios de la organización</li>
              <li>Todos los items y estados</li>
              <li>Todas las categorías</li>
              <li>Todos los datos asociados</li>
            </ul>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Eliminando...
              </>
            ) : (
              <>
                <i className="bi bi-trash me-2"></i>
                Sí, Eliminar
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Box>
  );
}


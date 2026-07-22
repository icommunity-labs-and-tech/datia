'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@/components/Box';
import BoxTitle from '@/components/BoxTitle';
import LoadingOverlay from '@/components/Loading';
import { Divider } from '@/components/Divider';
import { getStatusType, updateStatusType } from '@/actions/statusTypes';
import { Button, Form, Alert } from '@/components/legacy/bootstrap-compat';
import StatusTypeFieldBuilder, { StatusTypeFieldDefinition } from '@/components/StatusTypeFieldBuilder';
import { useTranslations } from 'next-intl';

export default function StatusTypeEditPage() {
  const tCommon = useTranslations('common.actions');
  const tForms = useTranslations('forms');
  const tTables = useTranslations('tables');
  const { id } = useParams();
  const router = useRouter();
  const statusTypeId = id as string;
  const [statusType, setStatusType] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', template: [] as StatusTypeFieldDefinition[] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const stType = await getStatusType(statusTypeId);
        setStatusType(stType);
        setFormData({
          name: stType.name,
          description: stType.description,
          template: Array.isArray(stType.template) ? stType.template : []
        });
      } catch (e) {
        console.error(e);
        setError(tTables('loadStatusTypeError'));
      } finally {
        setIsLoading(false);
      }
    };
    if (statusTypeId) load();
  }, [statusTypeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await updateStatusType(statusTypeId, {
        name: formData.name,
        description: formData.description,
        template: formData.template
      });
      router.push(`/dashboard/status-types/${statusTypeId}`);
    } catch (err: any) {
      setError(err.message || tTables('updateStatusTypeError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingOverlay />;

  if (!statusType) {
    return (
      <Box>
        <BoxTitle message={tForms('editState')} />
        <p className="text-danger mb-0">{tTables('statusTypeDetail.notFound')}</p>
      </Box>
    );
  }

  return (
    <Box>
      <BoxTitle message={tForms('editState')} />
      <Divider />

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>{tForms('labels.name')}</Form.Label>
          <Form.Control
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{tForms('description')}</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{tForms('statusTypeFields')}</Form.Label>
          <StatusTypeFieldBuilder
            fields={formData.template}
            onChange={(fields: StatusTypeFieldDefinition[]) => {
              setFormData({ ...formData, template: fields });
            }}
            className="mt-2"
          />
        </Form.Group>

        <div className="d-flex gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push(`/dashboard/status-types/${statusTypeId}`)}
          >
            {tCommon('cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? tCommon('saving') : tCommon('saveChanges')}
          </Button>
        </div>
      </Form>
    </Box>
  );
}


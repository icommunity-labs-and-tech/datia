'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  NativeSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { listStatusTypes } from '@/actions/statusTypes';
import { createState } from '@/actions/states';
import GeolocationMap from './GeolocationMapClient';
import { parseTemplate, generateFieldLabel } from '@/lib/template-helpers';
import { IconDeviceFloppy } from '@tabler/icons-react';

interface StatusType {
  id: string;
  name: string;
  description: string;
  template?: any[];
  category?: {
    id: string;
    name: string;
  };
}

interface AddStateFormProps {
  item?: any;
  itemId?: string;
  onSuccess?: () => void;
  onStateCreated?: (state: any) => void;
  show?: boolean;
  onHide?: () => void;
}

export default function AddStateForm({
  item,
  itemId,
  onSuccess,
  onStateCreated,
  show = true,
  onHide
}: AddStateFormProps) {
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const [statusTypes, setStatusTypes] = useState<StatusType[]>([]);
  const [selectedStatusType, setSelectedStatusType] = useState<StatusType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({
    description: '',
  });
  const [templateConfig, setTemplateConfig] = useState<Record<string, any>>({});

  // Cargar tipos de estado disponibles para la organización
  useEffect(() => {
    const fetchStatusTypes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await listStatusTypes();
        setStatusTypes(data);
        // Preseleccionar por última elección del operador (si existe)
        try {
          const last = window.localStorage.getItem('app:lastStatusTypeId');
          if (last) {
            const match = data.find((st: StatusType) => st.id === last);
            if (match) setSelectedStatusType(match);
          }
        } catch {}
      } catch (err) {
        console.error('Error cargando tipos de estado:', err);
        setError(`Error al cargar los tipos de estado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatusTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatusType) {
      setError('Debes seleccionar un tipo de estado');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Validar campos requeridos del template
    if (selectedStatusType.template && Array.isArray(selectedStatusType.template)) {
      for (const field of selectedStatusType.template) {
        if (field.required) {
          const fieldName = field.name;
          const fieldValue = templateConfig[fieldName];

          if (field.type === 'geolocation' && (!fieldValue || !fieldValue.lat || !fieldValue.lng)) {
            setError(tForms('fieldRequiredWithName', { field: field.label || fieldName }));
            setIsSubmitting(false);
            return;
          }

          if (field.type !== 'geolocation' && (!fieldValue || fieldValue === '')) {
            setError(tForms('fieldRequiredWithName', { field: field.label || fieldName }));
            setIsSubmitting(false);
            return;
          }
        }
      }
    }

    try {
      const result = await createState({
        itemId: itemId || item?.id,
        statusTypeId: selectedStatusType.id,
        description: formData.description,
        templateConfig: Object.keys(templateConfig).length > 0 ? templateConfig : undefined,
      });

      // Guardar última elección para atajos futuros
      try { window.localStorage.setItem('app:lastStatusTypeId', selectedStatusType.id); } catch {}

      if (onStateCreated) {
        onStateCreated(result);
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const friendly = typeof err === 'string'
        ? err
        : (err?.message
          || (err?.digest ? 'No se pudo crear el estado: verifica tu identidad (KYC) o reintenta la certificación.' : null)
          || 'Error al crear el estado');
      setError(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setTemplateField = (fieldName: string, value: any) => {
    setTemplateConfig(prev => ({ ...prev, [fieldName]: value }));
  };

  const renderTemplateField = (field: any, index: number) => {
    const fieldName = field.name || `field_${index}`;
    const fieldLabel = field.label || generateFieldLabel(fieldName);
    const fieldValue = templateConfig[fieldName];

    if (field.type === 'geolocation') {
      return (
        <GeolocationMap
          key={index}
          value={fieldValue ? { lat: fieldValue.lat, lng: fieldValue.lng } : undefined}
          onChange={(coords) => setTemplateField(fieldName, coords)}
          required={field.required}
          label={fieldLabel}
        />
      );
    }

    if (field.type === 'text' || field.type === 'email' || field.type === 'date') {
      return (
        <TextInput
          key={index}
          type={field.type === 'date' ? 'date' : field.type}
          label={fieldLabel}
          value={fieldValue || ''}
          onChange={(e) => setTemplateField(fieldName, e.target.value)}
          placeholder={field.type !== 'date' ? (field.placeholder || tCommon('enterField', { field: fieldLabel.toLowerCase() })) : undefined}
          required={field.required}
          disabled={isSubmitting}
        />
      );
    }

    if (field.type === 'number') {
      return (
        <TextInput
          key={index}
          type="number"
          label={fieldLabel}
          value={fieldValue ?? ''}
          onChange={(e) => setTemplateField(fieldName, e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder={field.placeholder || tCommon('enterField', { field: fieldLabel.toLowerCase() })}
          required={field.required}
          disabled={isSubmitting}
        />
      );
    }

    if (field.type === 'select' && Array.isArray(field.options)) {
      return (
        <NativeSelect
          key={index}
          label={fieldLabel}
          value={fieldValue || ''}
          onChange={(e) => setTemplateField(fieldName, e.target.value)}
          required={field.required}
          disabled={isSubmitting}
          data={[{ value: '', label: 'Seleccionar...' }, ...field.options.map((o: string) => ({ value: o, label: o }))]}
        />
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <Loader size="sm" aria-label="Cargando tipos de estado..." />
          <Text size="sm" c="dimmed">Cargando tipos de estado disponibles...</Text>
        </Stack>
      </Center>
    );
  }

  const templateArray = selectedStatusType ? parseTemplate(selectedStatusType.template) : [];

  const formContent = (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        {/* Selección rápida de tipo (chips) */}
        {statusTypes.length > 0 && (
          <Group gap="xs">
            {statusTypes.slice(0, 6).map((st) => (
              <Badge
                key={st.id}
                color={selectedStatusType?.id === st.id ? 'datiaBlue' : 'gray'}
                variant={selectedStatusType?.id === st.id ? 'filled' : 'light'}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedStatusType(st)}
              >
                {st.name}
              </Badge>
            ))}
          </Group>
        )}

        {/* Selección del tipo de estado */}
        <Select
          label="Tipo de Estado"
          placeholder="Selecciona un tipo de estado"
          value={selectedStatusType?.id || null}
          onChange={(value) => {
            const statusType = statusTypes.find(st => st.id === value);
            setSelectedStatusType(statusType || null);
            setTemplateConfig({});
          }}
          data={statusTypes.map((st) => ({ value: st.id, label: st.name }))}
          required
          disabled={isSubmitting}
          description={selectedStatusType?.description}
          searchable
        />

        {/* Preview del título generado */}
        {selectedStatusType && item && (
          <Alert color="datiaBlue" variant="light">
            <Text size="sm"><strong>Título generado:</strong> {item.name} - {selectedStatusType.name}</Text>
          </Alert>
        )}

        {/* Descripción */}
        <Textarea
          label="Descripción"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe el estado actual del activo..."
          disabled={isSubmitting}
        />

        {/* Campos del template del StatusType */}
        {templateArray.map((field: any, index: number) => renderTemplateField(field, index))}

        {/* Mensaje de error */}
        {error && (
          <Alert color="red" title="Error al crear estado">
            {error}
          </Alert>
        )}

        {/* Botones de acción */}
        <Button
          type="submit"
          color="green"
          size="md"
          disabled={isSubmitting || !selectedStatusType}
          leftSection={<IconDeviceFloppy size={15} stroke={1.7} />}
        >
          {isSubmitting ? 'Creando estado...' : 'Guardar Estado'}
        </Button>
      </Stack>
    </form>
  );

  // Si se está usando como modal
  if (show !== undefined && onHide) {
    return (
      <Modal opened={show} onClose={onHide} size="lg" centered title="Añadir Estado">
        {formContent}
      </Modal>
    );
  }

  // Si se está usando como componente normal
  return formContent;
}

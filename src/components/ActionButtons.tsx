import React from 'react';
import { Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';

interface ActionButtonsProps {
  entityId: string;
  entityName: string;
  editPath?: string;
  onDelete: () => void;
  showEdit?: boolean;
  showDelete?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
}

export default function ActionButtons({
  entityId,
  entityName,
  editPath,
  onDelete,
  showEdit = true,
  showDelete = true,
  size = 'sm',
  className = ''
}: ActionButtonsProps) {
  const router = useRouter();

  const handleEdit = () => {
    if (editPath) {
      router.push(editPath);
    }
  };

  return (
    <div className={`d-flex gap-2 ${className}`}>
      {showEdit && editPath && (
        <Button
          variant="outline-secondary"
          size={size}
          onClick={handleEdit}
          title={`Editar ${entityName}`}
        >
          <i className="bi bi-pencil me-1"></i>
          Editar
        </Button>
      )}
      
      {showDelete && (
        <Button
          variant="outline-danger"
          size={size}
          onClick={onDelete}
          title={`Eliminar ${entityName}`}
        >
          <i className="bi bi-trash me-1"></i>
          Eliminar
        </Button>
      )}
    </div>
  );
}

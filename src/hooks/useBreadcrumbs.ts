'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface BreadcrumbSegment {
  id: string;
  label: string;
  href: string;
  isLast: boolean;
}

interface EntityData {
  id: string;
  name?: string;
  title?: string;
  email?: string;
}

export function useBreadcrumbs() {
  const pathname = usePathname();
  const [segments, setSegments] = useState<BreadcrumbSegment[]>([]);
  const [loading, setLoading] = useState(true);

  const truncate = (text: string, max = 20) =>
    text.length > max ? text.slice(0, max - 1) + '…' : text;

  const getEntityName = async (entityType: string, id: string): Promise<string> => {
    try {
      let endpoint = '';
      
      switch (entityType) {
        case 'items':
          endpoint = `/api/items/${id}`;
          break;
        case 'categories':
          endpoint = `/api/categories/${id}`;
          break;
        case 'users':
          endpoint = `/api/users/${id}`;
          break;
        case 'states':
          endpoint = `/api/states/${id}`;
          break;
        default:
          return truncate(id);
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        return truncate(id);
      }

      const data: EntityData = await response.json();
      
      // Extraer el nombre según el tipo de entidad
      let name = '';
      if (entityType === 'users' && data.email) {
        name = data.email;
      } else if (data.name) {
        name = data.name;
      } else if (data.title) {
        name = data.title;
      } else {
        name = id;
      }

      return truncate(name);
    } catch (error) {
      console.error(`Error fetching ${entityType} name for id ${id}:`, error);
      return truncate(id);
    }
  };

  const getSegmentLabel = (segment: string, index: number, allSegments: string[]): string => {
    // Mapear nombres de rutas a etiquetas más amigables
    const routeLabels: Record<string, string> = {
      'dashboard': 'Inicio',
      'categories': 'Categorías',
      'items': 'Items',
      'users': 'Usuarios',
      'states': 'Estados',
      'passports': 'Pasaportes',
      'profile': 'Perfil',
      'edit': 'Editar',
      'add-state': 'Agregar Estado',
      'customer': 'Cliente',
      'operator': 'Operador',
      'auth': 'Autenticación',
      'login': 'Iniciar Sesión',
      'signup': 'Registrarse',
      'logout': 'Cerrar Sesión',
      'energy': 'Energía',
      'sources': 'Fuentes de Energía',
      'consumption': 'Consumo Energético',
      'emissions': 'Emisiones CO₂',
    };

    return routeLabels[segment] || segment[0].toUpperCase() + segment.slice(1);
  };

  const isEntityId = (segment: string, index: number, allSegments: string[]): boolean => {
    // Verificar si el segmento anterior indica que este es un ID de entidad
    if (index === 0) return false;
    
    const previousSegment = allSegments[index - 1];
    const entityRoutes = ['items', 'categories', 'users', 'states'];
    
    return entityRoutes.includes(previousSegment);
  };

  useEffect(() => {
    const buildBreadcrumbs = async () => {
      setLoading(true);
      
      const pathSegments = pathname.split('/').filter(Boolean);
      const breadcrumbSegments: BreadcrumbSegment[] = [];

      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        const href = '/' + pathSegments.slice(0, i + 1).join('/');
        const isLast = i === pathSegments.length - 1;

        let label: string;

        if (isEntityId(segment, i, pathSegments)) {
          // Este es un ID de entidad, obtener el nombre
          const entityType = pathSegments[i - 1];
          label = await getEntityName(entityType, segment);
        } else {
          // Es una ruta normal, usar el mapeo de etiquetas
          label = getSegmentLabel(segment, i, pathSegments);
        }

        breadcrumbSegments.push({
          id: href,
          label,
          href,
          isLast
        });
      }

      setSegments(breadcrumbSegments);
      setLoading(false);
    };

    buildBreadcrumbs();
  }, [pathname]);

  return { segments, loading };
}

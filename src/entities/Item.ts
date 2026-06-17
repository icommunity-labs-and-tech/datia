import { publishSuccessNotification, publishErrorNotification } from '@/lib/notificationEvents';

export class Item {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public categoryId: string,
    public imageUrl?: string
  ) {}

  /**
   * Publish success notification for item creation
   */
  publishCreationNotification(): void {
    publishSuccessNotification(
      'Item Creado',
      `Se ha creado el item "${this.name}"`
    );
  }

  /**
   * Publish error notification for item creation failure
   */
  publishErrorNotification(error: Error): void {
    publishErrorNotification(
      'Error al Crear Item',
      `No se pudo crear el item: ${error.message}`
    );
  }
} 
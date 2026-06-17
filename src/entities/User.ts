import { publishInfoNotification, publishErrorNotification } from '@/lib/notificationEvents';

export class User {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    public role: string
  ) {}

  /**
   * Publish info notification for user creation
   */
  publishCreationNotification(): void {
    publishInfoNotification(
      'Usuario Creado',
      `Se ha creado el usuario "${this.email}"`
    );
  }

  /**
   * Publish error notification for user creation failure
   */
  publishErrorNotification(error: Error): void {
    publishErrorNotification(
      'Error al Crear Usuario',
      `No se pudo crear el usuario: ${error.message}`
    );
  }
} 
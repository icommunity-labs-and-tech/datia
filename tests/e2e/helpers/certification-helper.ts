import { Page } from '@playwright/test';

export interface CertificationOptions {
  timeout?: number;
  pollInterval?: number;
}

export interface StateData {
  itemId: string;
  statusType: string;
  description: string;
}

export class CertificationTestHelper {
  /**
   * Espera a que un estado sea certificado mediante polling del checker API
   * @param stateId ID del estado a verificar
   * @param options Opciones de timeout y intervalo de polling
   * @returns Promise<boolean> true si el estado fue certificado, false si timeout
   */
  static async waitForCertification(
    stateId: string, 
    options: CertificationOptions = {}
  ): Promise<boolean> {
    const { timeout = 60000, pollInterval = 5000 } = options;
    const startTime = Date.now();
    
    console.log(`Waiting for certification of state ${stateId}...`);
    
    while (Date.now() - startTime < timeout) {
      try {
        const state = await this.getStateViaChecker(stateId);
        
        if (state && state.backed === true) {
          console.log(`State ${stateId} certified successfully!`);
          return true;
        }
        
        console.log(`State ${stateId} not yet certified, waiting ${pollInterval}ms...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.warn(`Error checking certification for state ${stateId}:`, error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    console.log(`Timeout waiting for certification of state ${stateId}`);
    return false;
  }
  
  /**
   * Consulta el estado usando la API pública del checker
   * @param stateId ID del estado a consultar
   * @returns Promise<any> Datos del estado o null si no existe
   */
  static async getStateViaChecker(stateId: string): Promise<any> {
    try {
      // Usar la API pública del checker para verificar el estado
      const response = await fetch(`/api/checker/status/${stateId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Estado no encontrado
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error(`Error fetching state ${stateId} from checker:`, error);
      throw error;
    }
  }
  
  /**
   * Crea un estado mediante la UI usando el formulario AddStateForm
   * @param page Instancia de Playwright Page
   * @param stateData Datos del estado a crear
   * @returns Promise<string> ID del estado creado
   * @deprecated Este método está deprecado. Usar el flujo directo en el test.
   */
  static async createStateViaUI(page: Page, stateData: StateData): Promise<string> {
    console.log(`Creating state via UI for item ${stateData.itemId}...`);
    
    // Navegar a la página del item
    await page.goto(`/dashboard/items/${stateData.itemId}`);
    await page.waitForLoadState('networkidle');
    
    // Hacer clic en el botón de añadir estado
    const addStateButton = page.locator('[data-testid="add-state-button"]').first();
    await addStateButton.click();
    
    // Esperar a que aparezca el modal/formulario
    await page.waitForSelector('[data-testid="add-state-form"]', { timeout: 10000 });
    
    // Seleccionar tipo de estado
    const statusTypeSelect = page.locator('[data-testid="status-type-select"]');
    await statusTypeSelect.selectOption(stateData.statusType);
    
    // Llenar descripción
    const descriptionTextarea = page.locator('[data-testid="description-textarea"]');
    await descriptionTextarea.fill(stateData.description);
    
    // Enviar formulario
    const submitButton = page.locator('[data-testid="submit-button"]');
    await submitButton.click();
    
    // Esperar confirmación de creación
    await page.waitForSelector('[data-testid="state-created-success"]', { timeout: 10000 });
    
    // Obtener ID del estado creado
    const stateId = await this.getStateIdFromUI(page);
    
    console.log(`State created successfully with ID: ${stateId}`);
    return stateId;
  }
  
  /**
   * Extrae el ID del estado creado desde los elementos de la UI
   * @param page Instancia de Playwright Page
   * @returns Promise<string> ID del estado
   */
  static async getStateIdFromUI(page: Page): Promise<string> {
    console.log('Extracting state ID from UI...');
    
    // Método 1: Buscar en elementos con data-state-id
    const stateElement = page.locator('[data-state-id]').first();
    const stateIdFromAttr = await stateElement.getAttribute('data-state-id');
    
    if (stateIdFromAttr) {
      console.log(`Found state ID from data-state-id: ${stateIdFromAttr}`);
      return stateIdFromAttr;
    }
    
    // Método 2: Buscar en elementos con data-testid="state-item"
    const stateItemElement = page.locator('[data-testid="state-item"]').first();
    const stateIdFromTestId = await stateItemElement.getAttribute('data-state-id');
    
    if (stateIdFromTestId) {
      console.log(`Found state ID from state-item: ${stateIdFromTestId}`);
      return stateIdFromTestId;
    }
    
    // Método 3: Buscar en la URL actual (puede contener el ID del estado)
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Método 4: Buscar en elementos de la tabla de estados
    const stateRow = page.locator('tr').filter({ hasText: 'Reparado' }).first();
    const stateIdFromRow = await stateRow.getAttribute('data-state-id');
    
    if (stateIdFromRow) {
      console.log(`Found state ID from table row: ${stateIdFromRow}`);
      return stateIdFromRow;
    }
    
    // Método 5: Buscar en elementos con clase específica de estado
    const stateCard = page.locator('.state-card, .card').first();
    const stateIdFromCard = await stateCard.getAttribute('data-state-id');
    
    if (stateIdFromCard) {
      console.log(`Found state ID from state card: ${stateIdFromCard}`);
      return stateIdFromCard;
    }
    
    // Método 6: Buscar en el texto de elementos que contengan información del estado
    const stateElements = page.locator('*').filter({ hasText: 'Reparado' });
    const count = await stateElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = stateElements.nth(i);
      const stateId = await element.getAttribute('data-state-id');
      
      if (stateId) {
        console.log(`Found state ID from text element: ${stateId}`);
        return stateId;
      }
    }
    
    // Fallback: Intentar extraer de la URL o de elementos de navegación
    const urlMatch = currentUrl.match(/\/states\/(\d+)/);
    if (urlMatch) {
      console.log(`Found state ID from URL: ${urlMatch[1]}`);
      return urlMatch[1];
    }
    
    // Último recurso: buscar en elementos que puedan contener el ID
    const allElements = page.locator('*');
    const elementCount = await allElements.count();
    
    for (let i = 0; i < Math.min(elementCount, 50); i++) { // Limitar búsqueda
      const element = allElements.nth(i);
      const stateId = await element.getAttribute('data-state-id');
      
      if (stateId && stateId.length > 0) {
        console.log(`Found state ID from element ${i}: ${stateId}`);
        return stateId;
      }
    }
    
    console.error('Could not extract state ID from UI');
    throw new Error('Could not extract state ID from UI');
  }
  
  /**
   * Verifica que un estado esté certificado en la UI
   * @param page Instancia de Playwright Page
   * @param stateId ID del estado a verificar
   * @returns Promise<boolean> true si está certificado en la UI
   */
  static async verifyStateCertificationInUI(page: Page, stateId: string): Promise<boolean> {
    try {
      // Buscar el elemento del estado específico
      const stateElement = page.locator(`[data-state-id="${stateId}"]`);
      
      // Verificar que existe el indicador de certificación
      const certifiedIndicator = stateElement.locator('[data-testid="state-certified"]');
      const isCertifiedVisible = await certifiedIndicator.isVisible();
      
      if (isCertifiedVisible) {
        console.log(`State ${stateId} is certified in UI`);
        return true;
      }
      
      // Verificar badge de backup
      const backupBadge = stateElement.locator('[data-testid="backup-status"]');
      const backupText = await backupBadge.textContent();
      
      if (backupText && backupText.includes('Respaldado')) {
        console.log(`State ${stateId} is backed up in UI`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`Error verifying certification in UI for state ${stateId}:`, error);
      return false;
    }
  }
  
  /**
   * Espera a que un estado sea certificado y verificado tanto en API como en UI
   * @param page Instancia de Playwright Page
   * @param stateId ID del estado a verificar
   * @param options Opciones de timeout y polling
   * @returns Promise<boolean> true si está certificado en ambos lugares
   */
  static async waitForCompleteCertification(
    page: Page,
    stateId: string,
    options: CertificationOptions = {}
  ): Promise<boolean> {
    console.log(`Waiting for complete certification of state ${stateId}...`);
    
    // Primero esperar certificación en API
    const apiCertified = await this.waitForCertification(stateId, options);
    
    if (!apiCertified) {
      console.log(`State ${stateId} not certified in API`);
      return false;
    }
    
    // Luego verificar en UI
    const uiCertified = await this.verifyStateCertificationInUI(page, stateId);
    
    if (!uiCertified) {
      console.log(`State ${stateId} not certified in UI, refreshing page...`);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Intentar verificar nuevamente después del refresh
      return await this.verifyStateCertificationInUI(page, stateId);
    }
    
    console.log(`State ${stateId} fully certified in both API and UI`);
    return true;
  }
}

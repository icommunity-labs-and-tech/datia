import { test, expect } from '@playwright/test';
import { loginAdmin } from './utils/auth';
import { CertificationTestHelper, StateData } from './helpers/certification-helper';

test.describe('Complete State Certification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login como admin antes de cada test
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@certypass.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
  });

  test('should create item, create state and verify blockchain certification via checker', async ({ page }) => {
    console.log('Starting complete state certification flow test...');
    
    try {
      // 1. Navegar a la página de items
      console.log('Step 1: Navigating to items page...');
      await page.goto('/dashboard/items');
      await page.waitForLoadState('networkidle');

      // 2. Crear un item de prueba
      console.log('Step 2: Creating test item...');
      const itemData = {
        customId: `test-item-${Date.now()}`,
        name: `Test Item ${Date.now()}`,
        description: `Test item for certification flow - ${Date.now()}`,
        categoryId: '1' // Usar la primera categoría disponible
      };

      // Hacer clic en el botón "Añadir"
      await page.click('button:has-text("Añadir")');
      await page.waitForSelector('[data-testid="modal"]', { timeout: 10000 });

      // Llenar el formulario del item
      await page.fill('input[name="customId"]', itemData.customId);
      await page.fill('input[name="name"]', itemData.name);
      await page.fill('textarea[name="description"]', itemData.description);
      
      // Seleccionar categoría (usar la primera opción disponible)
      await page.selectOption('select[name="categoryId"]', itemData.categoryId);

      // Enviar el formulario
      await page.click('button[type="submit"]');
      
      // Esperar a que se cierre el modal y se recargue la página
      await page.waitForSelector('[data-testid="modal"]', { state: 'hidden', timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // 3. Buscar el item creado en la tabla y hacer clic en él
      console.log('Step 3: Navigating to created item...');
      await page.click(`tr:has-text("${itemData.name}")`);
      await page.waitForLoadState('networkidle');

      // Verificar que estamos en la página del item
      await expect(page).toHaveURL(/\/dashboard\/items\/\d+/);
      console.log('Successfully navigated to item detail page');

      // 4. Crear un estado para el item
      console.log('Step 4: Creating state for the item...');
      const stateData: StateData = {
        itemId: '', // Se determinará automáticamente desde la URL
        statusType: 'Reparado', // Usar un tipo de estado existente
        description: `Test state for blockchain certification - ${Date.now()}`
      };

      // Buscar el botón para añadir estado (puede ser "Añadir Estado" o similar)
      const addStateButton = page.locator('button:has-text("Añadir Estado"), button:has-text("Nuevo Estado"), [data-testid="add-state-button"]').first();
      await addStateButton.click();
      
      // Esperar a que aparezca el formulario de estado
      await page.waitForSelector('form, [data-testid="add-state-form"]', { timeout: 10000 });

      // Llenar el formulario del estado
      await page.selectOption('select[name="statusType"]', stateData.statusType);
      await page.fill('textarea[name="description"]', stateData.description);

      // Enviar el formulario del estado
      await page.click('button[type="submit"]');
      
      // Esperar a que se procese el estado
      await page.waitForLoadState('networkidle');

      // 5. Obtener el ID del estado creado desde la UI
      console.log('Step 5: Getting state ID from UI...');
      const stateId = await CertificationTestHelper.getStateIdFromUI(page);
      expect(stateId).toBeTruthy();
      console.log(`State created with ID: ${stateId}`);
      
      // 6. Verificar que el estado se creó correctamente
      console.log('Step 6: Verifying state creation...');
      const initialState = await CertificationTestHelper.getStateViaChecker(stateId);
      
      expect(initialState).toBeTruthy();
      expect(initialState.backed).toBe(false); // Inicialmente no respaldado
      console.log('State created successfully and not yet certified');
      
      // 7. Esperar certificación con polling (60 segundos timeout, 5 segundos intervalo)
      console.log('Step 7: Waiting for blockchain certification...');
      const certificationOptions = {
        timeout: 60000,  // 60 segundos timeout
        pollInterval: 5000 // 5 segundos intervalo
      };
      
      const isCertified = await CertificationTestHelper.waitForCompleteCertification(
        page,
        stateId,
        certificationOptions
      );
      
      // 8. Verificar que el estado fue certificado exitosamente
      expect(isCertified).toBe(true);
      console.log('State certification completed successfully!');
      
      // 9. Verificar estado certificado usando checker API
      console.log('Step 8: Verifying final state via checker API...');
      const finalState = await CertificationTestHelper.getStateViaChecker(stateId);
      
      expect(finalState).toBeTruthy();
      expect(finalState.backed).toBe(true);
      expect(finalState.backedAt).toBeTruthy();
      
      // 10. Verificar que backedAt está presente y es una fecha válida
      const backedAtDate = new Date(finalState.backedAt);
      expect(backedAtDate).toBeInstanceOf(Date);
      expect(backedAtDate.getTime()).toBeGreaterThan(0);
      
      // 11. Verificar que backedAt es posterior a la creación del estado
      const createdAtDate = new Date(finalState.createdAt);
      expect(backedAtDate.getTime()).toBeGreaterThan(createdAtDate.getTime());
      
      console.log(`Final verification: State ${stateId} is certified with backedAt: ${finalState.backedAt}`);
      
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('should handle certification timeout gracefully', async ({ page }) => {
    console.log('Testing certification timeout handling...');
    
    // Usar un stateId que no existe para probar el timeout
    const nonExistentStateId = 'non-existent-state-id';
    
    const certificationOptions = {
      timeout: 10000,  // 10 segundos timeout para test rápido
      pollInterval: 2000 // 2 segundos intervalo
    };
    
    const isCertified = await CertificationTestHelper.waitForCertification(
      nonExistentStateId,
      certificationOptions
    );
    
    // Debería retornar false por timeout
    expect(isCertified).toBe(false);
    console.log('Timeout handling test completed successfully');
  });

  test('should verify state creation and initial state', async ({ page }) => {
    console.log('Testing state creation and initial state verification...');
    
    const stateData: StateData = {
      itemId: 'test-item-initial-state',
      statusType: 'test-status-type',
      description: `Test state for initial verification - ${Date.now()}`
    };
    
    // Crear estado
    const stateId = await CertificationTestHelper.createStateViaUI(page, stateData);
    
    // Verificar estado inicial
    const initialState = await CertificationTestHelper.getStateViaChecker(stateId);
    
    expect(initialState).toBeTruthy();
    expect(initialState.id).toBe(stateId);
    expect(initialState.backed).toBe(false);
    expect(initialState.backedAt).toBeNull();
    expect(initialState.description).toBe(stateData.description);
    
    console.log('Initial state verification completed successfully');
  });
});

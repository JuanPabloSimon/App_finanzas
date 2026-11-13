import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppDatabase } from '../../../src/data/db/appDatabase.js';
import { SqliteCategoryRepository } from '../../../src/data/repositories/sqliteCategoryRepository.js';
import { SqliteExpenseRepository } from '../../../src/data/repositories/sqliteExpenseRepository.js';
import { Expense } from '../../../src/domain/models/expense.js';
import { ExpenseFormScreen } from '../../../src/features/expenses/ExpenseFormScreen.jsx';

const h = React.createElement;

describe('H1 pantalla de registro de gasto, validaciones, listado del mes y diseño Mobile First + Desktop', () => {
  let db;
  let categoryRepo;
  let expenseRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('[H1-R1] al abrir el formulario propone la fecha del día actual (YYYY-MM-DD), ordena primero las categorías frecuentes y preselecciona una categoría válida', async () => {
    const categories = await categoryRepo.findAll();
    const transporte = categories.find((c) => c.name === 'Transporte');
    await expenseRepo.save(
      new Expense({
        amountCents: 90000,
        date: '2026-11-01',
        categoryId: transporte.id,
        createdAt: '2026-11-01T08:00:00',
      }),
    );

    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 390,
    });

    const state = await controller.initialize();
    assert.equal(state.dateInput, '2026-11-06');
    assert.equal(state.categories[0].name, 'Transporte');
    assert.equal(state.categoryId, transporte.id);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="expense-date-input"/);
    assert.match(html, /value="2026-11-06"/);
    assert.match(html, /Categoría \(frecuentes primero\)/);
    assert.match(html, /Transporte/);
  });

  it('[H1-R2][H1-R3] al confirmar un monto mayor que cero, fecha y categoría guarda el gasto en centavos enteros y actualiza de inmediato el listado del mes con monto formateado, fecha, categoría y nota', async () => {
    const fixedNow = new Date(2026, 10, 6, 15, 30, 0);
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      now: () => fixedNow,
      viewportWidth: 390,
    });

    await controller.initialize();
    controller.setAmountInput('1500,50');
    controller.setDateInput('2026-11-06');
    controller.setCategoryId(1);
    controller.setNoteInput('Compra en verdulería');

    const afterSubmit = await controller.submitExpense();
    assert.equal(afterSubmit.amountError, null);
    assert.equal(afterSubmit.amountInput, '');
    assert.equal(afterSubmit.expenses.length, 1);
    assert.equal(afterSubmit.expenses[0].amountCents, 150050);
    assert.equal(afterSubmit.expenses[0].date, '2026-11-06');
    assert.equal(afterSubmit.expenses[0].categoryName, 'Alimentos');
    assert.equal(afterSubmit.expenses[0].note, 'Compra en verdulería');
    assert.equal(afterSubmit.expenses[0].createdAt, '2026-11-06T15:30:00');
    assert.equal(afterSubmit.expenses[0].updatedAt, '2026-11-06T15:30:00');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="month-expense-list"/);
    assert.match(html, /\$ 1\.500,50/);
    assert.match(html, /2026-11-06/);
    assert.match(html, /Alimentos/);
    assert.match(html, /Compra en verdulería/);
  });

  it('[H1-R4][H1-R5] si el monto está vacío, no es numérico, es cero o es negativo no guarda el gasto en SQLite y muestra un mensaje de validación junto al campo de monto', async () => {
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 390,
    });

    await controller.initialize();

    for (const invalidAmount of ['', '   ', '0', '0,00', '-250', 'texto']) {
      controller.setAmountInput(invalidAmount);
      const state = await controller.submitExpense();

      assert.equal(state.expenses.length, 0);
      assert.match(state.amountError, /Ingresá un monto mayor que cero/);

      const html = renderToStaticMarkup(controller.renderElement());
      assert.match(html, /data-testid="amount-error"/);
      assert.match(html, /Ingresá un monto mayor que cero/);
    }

    const dbRows = await db.all('SELECT * FROM expenses');
    assert.equal(dbRows.length, 0);
  });

  it('[H1-R6] al confirmar el registro dejando vacíos subcategoría y nota guarda null en ambas columnas', async () => {
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
    });

    await controller.initialize();
    controller.setAmountInput('800');
    controller.setSubcategoryInput('   ');
    controller.setNoteInput('');

    const state = await controller.submitExpense();
    assert.equal(state.expenses.length, 1);
    assert.equal(state.expenses[0].subcategory, null);
    assert.equal(state.expenses[0].note, null);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.doesNotMatch(html, /data-testid="expense-item-note"/);
  });

  it('[H1-R7] al completar subcategoría y nota persiste ambos valores recortados (trim) y los muestra en el listado mensual', async () => {
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
    });

    await controller.initialize();
    controller.setAmountInput('3200');
    controller.setCategoryId(2);
    controller.setSubcategoryInput('  Subte  ');
    controller.setNoteInput('  Carga SUBE mensual  ');

    const state = await controller.submitExpense();
    assert.equal(state.expenses.length, 1);
    assert.equal(state.expenses[0].subcategory, 'Subte');
    assert.equal(state.expenses[0].note, 'Carga SUBE mensual');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /Transporte · Subte/);
    assert.match(html, /Carga SUBE mensual/);
    assert.match(html, /\$ 3\.200/);
  });

  it('[H1-R8] aplica diseño Mobile First (< 768px) en 1 columna con botón táctil >= 48px y se adapta a pantallas Desktop (>= 768px) en grilla de 2 columnas con soporte de teclado', async () => {
    const categories = await categoryRepo.findAll();

    const mobileTree = renderToStaticMarkup(
      h(ExpenseFormScreen, {
        initialCategories: categories,
        initialExpenses: [],
        initialDate: '2026-11-06',
        viewportWidth: 390,
      }),
    );
    assert.match(mobileTree, /data-layout="mobile"/);
    assert.match(mobileTree, /data-columns="1"/);

    const mobileStyles = ExpenseFormScreen.buildStyles(390);
    assert.equal(mobileStyles.gridColumns, 1);
    assert.equal(mobileStyles.submitButton.minHeight, 48);
    assert.equal(mobileStyles.submitButton.width, '100%');
    assert.equal(mobileStyles.amountInput.minHeight, 48);

    const desktopTree = renderToStaticMarkup(
      h(ExpenseFormScreen, {
        initialCategories: categories,
        initialExpenses: [],
        initialDate: '2026-11-06',
        viewportWidth: 1280,
      }),
    );
    assert.match(desktopTree, /data-layout="desktop"/);
    assert.match(desktopTree, /data-columns="2"/);

    const desktopStyles = ExpenseFormScreen.buildStyles(1280);
    assert.equal(desktopStyles.gridColumns, 2);
    assert.equal(desktopStyles.wrapper.maxWidth, 960);

    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 1280,
    });
    await controller.initialize();
    const desktopHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(desktopHtml, /data-testid="expense-form"/);
    assert.match(desktopHtml, /tabindex="0"/);
  });

  it('[H2-R1] al seleccionar editar sobre un gasto existente del listado mensual carga sus datos actuales en el formulario y activa el modo edición', async () => {
    const saved = await expenseRepo.save(
      new Expense({
        amountCents: 185050,
        date: '2026-11-04',
        categoryId: 2,
        subcategory: 'Subte',
        note: 'Carga semanal',
        createdAt: '2026-11-04T09:00:00',
        updatedAt: '2026-11-04T09:00:00',
      }),
    );

    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 390,
    });

    await controller.initialize();
    const editState = controller.startEditExpense(saved.id);

    assert.equal(editState.editingExpenseId, saved.id);
    assert.equal(editState.amountInput, '1850,50');
    assert.equal(editState.dateInput, '2026-11-04');
    assert.equal(editState.categoryId, 2);
    assert.equal(editState.subcategoryInput, 'Subte');
    assert.equal(editState.noteInput, 'Carga semanal');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-mode="edit"/);
    assert.match(html, /Editar gasto/);
    assert.match(html, /Guardar cambios/);
    assert.match(html, /data-testid="cancel-edit-button"/);
    assert.match(html, /value="1850,50"/);
    assert.match(html, /value="2026-11-04"/);
    assert.match(html, /value="Subte"/);
    assert.match(html, /value="Carga semanal"/);

    const afterCancel = controller.cancelEditExpense();
    assert.equal(afterCancel.editingExpenseId, null);
    assert.equal(afterCancel.amountInput, '');
  });

  it('[H2-R2][H2-R3] al confirmar la edición de un gasto válido actualiza SQLite conservando created_at, refleja los cambios en el listado y recalcula el total del mes sin reiniciar', async () => {
    const first = await expenseRepo.save(
      new Expense({
        amountCents: 100000,
        date: '2026-11-03',
        categoryId: 1,
        subcategory: 'Almacén',
        note: 'Pan y leche',
        createdAt: '2026-11-03T10:00:00',
        updatedAt: '2026-11-03T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 200000,
        date: '2026-11-05',
        categoryId: 2,
        subcategory: 'Colectivo',
        note: 'SUBE',
        createdAt: '2026-11-05T11:00:00',
        updatedAt: '2026-11-05T11:00:00',
      }),
    );

    const editNow = new Date(2026, 10, 10, 14, 45, 0);
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      now: () => editNow,
      viewportWidth: 390,
    });

    const initialState = await controller.initialize();
    assert.equal(initialState.monthlyTotalCents, 300000);

    controller.startEditExpense(first.id);
    controller.setAmountInput('1750,25');
    controller.setCategoryId(3);
    controller.setSubcategoryInput('  Internet  ');
    controller.setNoteInput('  Fibra óptica  ');

    const afterUpdate = await controller.submitExpense();
    assert.equal(afterUpdate.editingExpenseId, null);
    assert.equal(afterUpdate.amountInput, '');
    assert.equal(afterUpdate.monthlyTotalCents, 375025);

    const editedItem = afterUpdate.expenses.find((item) => item.id === first.id);
    assert.notEqual(editedItem, undefined);
    assert.equal(editedItem.amountCents, 175025);
    assert.equal(editedItem.categoryId, 3);
    assert.equal(editedItem.categoryName, 'Servicios');
    assert.equal(editedItem.subcategory, 'Internet');
    assert.equal(editedItem.note, 'Fibra óptica');
    assert.equal(editedItem.createdAt, '2026-11-03T10:00:00');
    assert.equal(editedItem.updatedAt, '2026-11-10T14:45:00');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /Servicios · Internet/);
    assert.match(html, /Fibra óptica/);
    assert.match(html, /\$ 1\.750,25/);
    assert.match(html, /data-testid="month-total-amount"[^>]*>\$ 3\.750,25</);
  });

  it('[H2-R4] durante la edición rechaza montos vacíos, cero, negativos o no numéricos e identificadores inexistentes sin modificar el registro en SQLite', async () => {
    const saved = await expenseRepo.save(
      new Expense({
        amountCents: 120000,
        date: '2026-11-06',
        categoryId: 1,
        note: 'Original sin cambios',
        createdAt: '2026-11-06T09:30:00',
        updatedAt: '2026-11-06T09:30:00',
      }),
    );

    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
    });

    await controller.initialize();
    controller.startEditExpense(saved.id);

    for (const badAmount of ['', '0', '-500', 'invalido']) {
      controller.setAmountInput(badAmount);
      const stateAfterInvalid = await controller.submitExpense();
      assert.equal(stateAfterInvalid.editingExpenseId, saved.id);
      assert.match(stateAfterInvalid.amountError, /Ingresá un monto mayor que cero/);
      assert.equal(stateAfterInvalid.monthlyTotalCents, 120000);
    }

    const dbRow = await expenseRepo.findById(saved.id);
    assert.equal(dbRow.amountCents, 120000);
    assert.equal(dbRow.note, 'Original sin cambios');

    const stateNotFoundEdit = controller.startEditExpense(9999);
    assert.match(stateNotFoundEdit.formError, /No existe el gasto 9999/);

    const stateNotFoundDelete = await controller.confirmDeleteExpense(9999);
    assert.match(stateNotFoundDelete.formError, /No existe el gasto 9999/);
  });

  it('[H2-R5][H2-R6][H2-R7] solicita confirmación antes de eliminar, conserva el gasto si se cancela y al confirmar lo borra de SQLite y recalcula el total del mes', async () => {
    const first = await expenseRepo.save(
      new Expense({
        amountCents: 150000,
        date: '2026-11-04',
        categoryId: 1,
        note: 'Gasto 1',
        createdAt: '2026-11-04T10:00:00',
      }),
    );
    const second = await expenseRepo.save(
      new Expense({
        amountCents: 80000,
        date: '2026-11-06',
        categoryId: 2,
        note: 'Gasto 2',
        createdAt: '2026-11-06T12:00:00',
      }),
    );

    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
    });

    const initial = await controller.initialize();
    assert.equal(initial.expenses.length, 2);
    assert.equal(initial.monthlyTotalCents, 230000);

    const confirmingState = controller.requestDeleteExpense(first.id);
    assert.equal(confirmingState.confirmingDeleteId, first.id);
    assert.equal((await expenseRepo.findById(first.id)) !== null, true);

    const confirmHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(confirmHtml, new RegExp(`data-testid="delete-confirm-box-${first.id}"`));
    assert.match(
      confirmHtml,
      new RegExp(`data-testid="confirm-delete-button-${first.id}"`),
    );
    assert.match(
      confirmHtml,
      new RegExp(`data-testid="cancel-delete-button-${first.id}"`),
    );

    const cancelledState = controller.cancelDeleteExpense();
    assert.equal(cancelledState.confirmingDeleteId, null);
    assert.equal(cancelledState.expenses.length, 2);
    assert.equal(cancelledState.monthlyTotalCents, 230000);
    assert.notEqual(await expenseRepo.findById(first.id), null);

    controller.requestDeleteExpense(first.id);
    const afterDelete = await controller.confirmDeleteExpense(first.id);
    assert.equal(afterDelete.confirmingDeleteId, null);
    assert.equal(afterDelete.expenses.length, 1);
    assert.equal(afterDelete.expenses[0].id, second.id);
    assert.equal(afterDelete.monthlyTotalCents, 80000);
    assert.equal(await expenseRepo.findById(first.id), null);

    const finalHtml = renderToStaticMarkup(controller.renderElement());
    assert.doesNotMatch(finalHtml, /Gasto 1/);
    assert.match(finalHtml, /Gasto 2/);
    assert.match(finalHtml, /data-testid="month-total-amount"[^>]*>\$ 800</);
  });

  it('[H2-R8] presenta los controles de edición, eliminación, confirmación y total mensual con diseño Mobile First (< 768px) y adaptación Desktop (>= 768px)', async () => {
    const saved = await expenseRepo.save(
      new Expense({
        amountCents: 145000,
        date: '2026-11-06',
        categoryId: 1,
        note: 'Almuerzo',
        createdAt: '2026-11-06T13:00:00',
      }),
    );

    const mobileController = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 390,
    });
    await mobileController.initialize();
    mobileController.requestDeleteExpense(saved.id);

    const mobileStyles = ExpenseFormScreen.buildStyles(390);
    assert.equal(mobileStyles.gridColumns, 1);
    assert.equal(mobileStyles.actionButton.minHeight >= 44, true);
    assert.equal(mobileStyles.confirmDeleteButton.minHeight >= 44, true);
    assert.equal(mobileStyles.confirmBox.flexDirection, 'column');

    const mobileHtml = renderToStaticMarkup(mobileController.renderElement());
    assert.match(mobileHtml, /data-layout="mobile"/);
    assert.match(mobileHtml, /data-columns="1"/);
    assert.match(mobileHtml, new RegExp(`data-testid="edit-expense-button-${saved.id}"`));
    assert.match(
      mobileHtml,
      new RegExp(`data-testid="delete-expense-button-${saved.id}"`),
    );
    assert.match(mobileHtml, /data-testid="month-total-amount"/);

    const desktopController = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 1280,
    });
    await desktopController.initialize();
    desktopController.startEditExpense(saved.id);

    const desktopStyles = ExpenseFormScreen.buildStyles(1280);
    assert.equal(desktopStyles.gridColumns, 2);
    assert.equal(desktopStyles.confirmBox.flexDirection, 'row');

    const desktopHtml = renderToStaticMarkup(desktopController.renderElement());
    assert.match(desktopHtml, /data-layout="desktop"/);
    assert.match(desktopHtml, /data-columns="2"/);
    assert.match(desktopHtml, /data-testid="cancel-edit-button"/);
    assert.match(desktopHtml, /tabindex="0"/);
  });

  it('[H3-R1][H3-R2][H3-R3] muestra por defecto el listado del mes en curso ordenado por fecha descendente con monto, categoría, nota y el total acumulado del mes', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 120000,
        date: '2026-11-01',
        categoryId: 1,
        subcategory: 'Verdulería',
        note: 'Frutas y verduras',
        createdAt: '2026-11-01T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 350050,
        date: '2026-11-06',
        categoryId: 3,
        subcategory: 'Luz',
        note: 'Factura mensual',
        createdAt: '2026-11-06T12:00:00',
      }),
    );

    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 390,
    });

    const state = await controller.initialize();
    assert.equal(state.activeYearMonth, '2026-11');
    assert.equal(state.expenses.length, 2);
    assert.equal(state.expenses[0].date, '2026-11-06');
    assert.equal(state.expenses[1].date, '2026-11-01');
    assert.equal(state.monthlyTotalCents, 470050);

    const html = renderToStaticMarkup(controller.renderElement());
    const idxNov6 = html.indexOf('2026-11-06');
    const idxNov1 = html.indexOf('2026-11-01');
    assert.equal(idxNov6 < idxNov1, true);
    assert.match(html, /Servicios · Luz/);
    assert.match(html, /Factura mensual/);
    assert.match(html, /\$ 3\.500,50/);
    assert.match(html, /Alimentos · Verdulería/);
    assert.match(html, /Frutas y verduras/);
    assert.match(html, /\$ 1\.200/);
    assert.match(html, /data-testid="month-total-amount"[^>]*>\$ 4\.700,50</);
  });

  it('[H3-R3][H3-R4] cuando no hay gastos en el mes muestra total $ 0 y presenta el estado vacío con acceso directo a la carga', async () => {
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 390,
    });

    const state = await controller.initialize();
    assert.equal(state.expenses.length, 0);
    assert.equal(state.monthlyTotalCents, 0);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="month-total-amount"[^>]*>\$ 0</);
    assert.match(html, /data-testid="empty-month-expenses"/);
    assert.match(html, /data-testid="empty-state-cta-button"/);
    assert.match(html, /Registrar gasto en este mes/);

    await controller.goToPreviousMonth();
    const afterCta = controller.activateEmptyStateCta();
    assert.equal(afterCta.editingExpenseId, null);
    assert.equal(afterCta.dateInput, '2026-10-01');
    assert.equal(afterCta.focusRequestedOnAmount, true);

    const htmlAfterCta = renderToStaticMarkup(controller.renderElement());
    assert.match(htmlAfterCta, /data-focus-requested="true"/);
    assert.match(htmlAfterCta, /value="2026-10-01"/);
  });

  it('[H3-R5][H3-R6] permite navegar al mes anterior y volver al mes siguiente recargando los gastos y el total de cada período sin avanzar más allá del mes actual', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 90000,
        date: '2026-10-15',
        categoryId: 2,
        note: 'Viajes de octubre',
        createdAt: '2026-10-15T09:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 210000,
        date: '2026-11-05',
        categoryId: 1,
        note: 'Supermercado noviembre',
        createdAt: '2026-11-05T11:00:00',
      }),
    );

    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 390,
    });

    const novState = await controller.initialize();
    assert.equal(novState.activeYearMonth, '2026-11');
    assert.equal(novState.canGoNextMonth, false);
    assert.equal(novState.monthlyTotalCents, 210000);

    const octState = await controller.goToPreviousMonth();
    assert.equal(octState.activeYearMonth, '2026-10');
    assert.equal(octState.canGoNextMonth, true);
    assert.equal(octState.expenses.length, 1);
    assert.equal(octState.expenses[0].note, 'Viajes de octubre');
    assert.equal(octState.monthlyTotalCents, 90000);

    const octHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(octHtml, /Octubre 2026 \(2026-10\)/);
    assert.match(octHtml, /Viajes de octubre/);
    assert.match(octHtml, /data-testid="month-total-amount"[^>]*>\$ 900</);

    const backToNov = await controller.goToNextMonth();
    assert.equal(backToNov.activeYearMonth, '2026-11');
    assert.equal(backToNov.canGoNextMonth, false);
    assert.equal(backToNov.expenses.length, 1);
    assert.equal(backToNov.expenses[0].note, 'Supermercado noviembre');
    assert.equal(backToNov.monthlyTotalCents, 210000);

    const stayAtCurrent = await controller.goToNextMonth();
    assert.equal(stayAtCurrent.activeYearMonth, '2026-11');
  });

  it('[H3-R8] presenta la barra de navegación mensual y el estado vacío con CTA aplicando diseño Mobile First (< 768px) y adaptación Desktop (>= 768px)', async () => {
    const mobileController = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 390,
    });
    await mobileController.initialize();

    const mobileStyles = ExpenseFormScreen.buildStyles(390);
    assert.equal(mobileStyles.gridColumns, 1);
    assert.equal(mobileStyles.monthNavButton.minHeight >= 44, true);
    assert.equal(mobileStyles.emptyStateCtaButton.minHeight >= 48, true);
    assert.equal(mobileStyles.emptyStateCtaButton.width, '100%');

    const mobileHtml = renderToStaticMarkup(mobileController.renderElement());
    assert.match(mobileHtml, /data-layout="mobile"/);
    assert.match(mobileHtml, /data-testid="month-navigation-bar"/);
    assert.match(mobileHtml, /data-testid="prev-month-button"/);
    assert.match(mobileHtml, /data-testid="next-month-button"/);
    assert.match(mobileHtml, /data-testid="empty-state-cta-button"/);

    const desktopController = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-06',
      viewportWidth: 1280,
    });
    await desktopController.initialize();

    const desktopStyles = ExpenseFormScreen.buildStyles(1280);
    assert.equal(desktopStyles.gridColumns, 2);
    assert.equal(desktopStyles.emptyStateCtaButton.width, 'auto');

    const desktopHtml = renderToStaticMarkup(desktopController.renderElement());
    assert.match(desktopHtml, /data-layout="desktop"/);
    assert.match(desktopHtml, /data-columns="2"/);
    assert.match(desktopHtml, /tabindex="0"/);
  });

  it('[H4-R1][H4-R2] permite crear una categoría propia con nombre válido, la persiste en SQLite y la deja inmediatamente disponible y seleccionada en el formulario de carga de gastos sin reiniciar', async () => {
    const fixedNow = new Date(2026, 10, 11, 10, 15, 0);
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-11',
      now: () => fixedNow,
      viewportWidth: 390,
    });

    const initialState = await controller.initialize();
    assert.equal(initialState.categories.length, 10);

    controller.setNewCategoryNameInput('  Mascotas  ');
    const afterCreate = await controller.createCustomCategory();

    assert.equal(afterCreate.categoryError, null);
    assert.equal(afterCreate.newCategoryNameInput, '');
    assert.equal(afterCreate.categories.length, 11);

    const mascotasCat = afterCreate.categories.find((c) => c.name === 'Mascotas');
    assert.notEqual(mascotasCat, undefined);
    assert.equal(mascotasCat.isPredefined, false);
    assert.equal(mascotasCat.createdAt, '2026-11-11T10:15:00');
    assert.equal(afterCreate.categoryId, mascotasCat.id);

    const htmlAfterCreate = renderToStaticMarkup(controller.renderElement());
    assert.match(
      htmlAfterCreate,
      new RegExp(`data-testid="category-option-${mascotasCat.id}"[^>]*>Mascotas<`),
    );
    assert.match(
      htmlAfterCreate,
      new RegExp(`data-testid="custom-badge-${mascotasCat.id}"[^>]*>Propia<`),
    );

    controller.setAmountInput('4500');
    controller.setNoteInput('Alimento balanceado');
    const afterExpense = await controller.submitExpense();
    assert.equal(afterExpense.expenses.length, 1);
    assert.equal(afterExpense.expenses[0].categoryId, mascotasCat.id);
    assert.equal(afterExpense.expenses[0].categoryName, 'Mascotas');
  });

  it('[H4-R3][H4-R4] rechaza nombres de categoría vacíos o que repitan otra existente sin distinguir mayúsculas (COLLATE NOCASE) mostrando el mensaje de validación sin duplicar en SQLite', async () => {
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-11',
      viewportWidth: 390,
    });

    await controller.initialize();

    for (const emptyName of ['', '   ']) {
      controller.setNewCategoryNameInput(emptyName);
      const stateEmpty = await controller.createCustomCategory();
      assert.equal(stateEmpty.categories.length, 10);
      assert.match(stateEmpty.categoryError, /no puede estar vacío/);

      const htmlEmpty = renderToStaticMarkup(controller.renderElement());
      assert.match(htmlEmpty, /data-testid="category-error"/);
    }

    await controller.createCustomCategory('Mascotas');

    for (const duplicateName of ['alimentos', 'ALIMENTOS', '  Alimentos ', 'mascotas', 'MASCOTAS']) {
      controller.setNewCategoryNameInput(duplicateName);
      const stateDup = await controller.createCustomCategory();
      assert.equal(stateDup.categories.length, 11);
      assert.match(stateDup.categoryError, /Ya existe una categoría con el nombre/);

      const htmlDup = renderToStaticMarkup(controller.renderElement());
      assert.match(htmlDup, /data-testid="category-error"/);
    }
  });

  it('[H4-R5][H4-R6] impide eliminar categorías predefinidas (omitiendo el botón de eliminar en la UI y rechazando la acción) y permite eliminar una categoría propia sin gastos asociados quitándola del selector', async () => {
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-11',
      viewportWidth: 390,
    });

    await controller.initialize();
    const afterCreate = await controller.createCustomCategory('Gimnasio');
    const gymCat = afterCreate.categories.find((c) => c.name === 'Gimnasio');
    assert.notEqual(gymCat, undefined);

    const htmlWithGym = renderToStaticMarkup(controller.renderElement());
    assert.match(htmlWithGym, /data-testid="predefined-badge-1"[^>]*>Predefinida</);
    assert.doesNotMatch(htmlWithGym, /data-testid="delete-category-button-1"/);
    assert.match(
      htmlWithGym,
      new RegExp(`data-testid="delete-category-button-${gymCat.id}"`),
    );

    const stateTryPredefined = controller.requestDeleteCategory(1);
    assert.match(stateTryPredefined.categoryError, /no se puede eliminar/);

    const stateTryConfirmPredefined = await controller.confirmDeleteCategory(1);
    assert.match(stateTryConfirmPredefined.categoryError, /no se puede eliminar/);
    assert.notEqual(await categoryRepo.findById(1), null);

    const stateRequestCustom = controller.requestDeleteCategory(gymCat.id);
    assert.equal(stateRequestCustom.deletingCategoryId, gymCat.id);
    assert.equal(stateRequestCustom.deletingCategoryExpenseCount, 0);

    const stateAfterDelete = await controller.confirmDeleteCategory(gymCat.id);
    assert.equal(stateAfterDelete.categories.length, 10);
    assert.equal(
      stateAfterDelete.categories.some((c) => c.id === gymCat.id),
      false,
    );
    assert.equal(await categoryRepo.findById(gymCat.id), null);

    const htmlAfterDelete = renderToStaticMarkup(controller.renderElement());
    assert.doesNotMatch(
      htmlAfterDelete,
      new RegExp(`data-testid="category-option-${gymCat.id}"`),
    );
  });

  it('[H4-R7] al eliminar una categoría propia con gastos asociados exige seleccionar una categoría de destino, reasigna los gastos y recién entonces elimina la categoría propia', async () => {
    const controller = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-11',
      viewportWidth: 390,
    });

    await controller.initialize();
    const afterCreate = await controller.createCustomCategory('Viajes');
    const viajesCat = afterCreate.categories.find((c) => c.name === 'Viajes');
    const ocioCat = afterCreate.categories.find((c) => c.name === 'Ocio');

    controller.setAmountInput('12500');
    controller.setCategoryId(viajesCat.id);
    controller.setNoteInput('Excursión');
    await controller.submitExpense();

    const stateDirectDelete = await controller.confirmDeleteCategory(viajesCat.id, null);
    assert.match(stateDirectDelete.categoryError, /Reasignalos a otra categoría/);
    assert.notEqual(await categoryRepo.findById(viajesCat.id), null);

    const stateRequest = controller.requestDeleteCategory(viajesCat.id);
    assert.equal(stateRequest.deletingCategoryId, viajesCat.id);
    assert.equal(stateRequest.deletingCategoryExpenseCount, 1);

    controller.setReassignTargetCategoryId(ocioCat.id);
    const reassignHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(
      reassignHtml,
      new RegExp(`data-testid="reassign-category-box-${viajesCat.id}"`),
    );
    assert.match(
      reassignHtml,
      new RegExp(`data-testid="reassign-target-select-${viajesCat.id}"`),
    );
    assert.match(
      reassignHtml,
      new RegExp(`data-testid="confirm-reassign-delete-button-${viajesCat.id}"`),
    );

    const cancelled = controller.cancelDeleteCategory();
    assert.equal(cancelled.deletingCategoryId, null);
    assert.notEqual(await categoryRepo.findById(viajesCat.id), null);

    controller.requestDeleteCategory(viajesCat.id);
    controller.setReassignTargetCategoryId(ocioCat.id);
    const afterReassignDelete = await controller.confirmDeleteCategory(
      viajesCat.id,
      ocioCat.id,
    );

    assert.equal(afterReassignDelete.categoryError, null);
    assert.equal(
      afterReassignDelete.categories.some((c) => c.id === viajesCat.id),
      false,
    );
    assert.equal(afterReassignDelete.expenses.length, 1);
    assert.equal(afterReassignDelete.expenses[0].categoryId, ocioCat.id);
    assert.equal(afterReassignDelete.expenses[0].categoryName, 'Ocio');
    assert.equal(afterReassignDelete.expenses[0].note, 'Excursión');
  });

  it('[H4-R8] presenta la gestión de categorías propias, badges y controles de reasignación con diseño Mobile First (< 768px) y adaptación Desktop (>= 768px)', async () => {
    const mobileController = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-11',
      viewportWidth: 390,
    });
    await mobileController.initialize();
    const stateMobile = await mobileController.createCustomCategory('Mascotas');
    const mascotas = stateMobile.categories.find((c) => c.name === 'Mascotas');

    const mobileStyles = ExpenseFormScreen.buildStyles(390);
    assert.equal(mobileStyles.gridColumns, 1);
    assert.equal(mobileStyles.categoryCreateRow.flexDirection, 'column');
    assert.equal(mobileStyles.createCategoryButton.minHeight >= 48, true);
    assert.equal(mobileStyles.createCategoryButton.width, '100%');
    assert.equal(mobileStyles.deleteActionButton.minHeight >= 44, true);

    const mobileHtml = renderToStaticMarkup(mobileController.renderElement());
    assert.match(mobileHtml, /data-layout="mobile"/);
    assert.match(mobileHtml, /data-columns="1"/);
    assert.match(mobileHtml, /data-testid="category-manager-section"/);
    assert.match(mobileHtml, /data-testid="new-category-name-input"/);
    assert.match(mobileHtml, /data-testid="create-category-button"/);
    assert.match(
      mobileHtml,
      new RegExp(`data-testid="delete-category-button-${mascotas.id}"`),
    );

    const desktopController = ExpenseFormScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-11',
      viewportWidth: 1280,
    });
    await desktopController.initialize();

    const desktopStyles = ExpenseFormScreen.buildStyles(1280);
    assert.equal(desktopStyles.gridColumns, 2);
    assert.equal(desktopStyles.categoryCreateRow.flexDirection, 'row');
    assert.equal(desktopStyles.createCategoryButton.width, 'auto');

    const desktopHtml = renderToStaticMarkup(desktopController.renderElement());
    assert.match(desktopHtml, /data-layout="desktop"/);
    assert.match(desktopHtml, /data-columns="2"/);
    assert.match(desktopHtml, /data-testid="category-manager-section"/);
    assert.match(desktopHtml, /tabindex="0"/);
  });
});

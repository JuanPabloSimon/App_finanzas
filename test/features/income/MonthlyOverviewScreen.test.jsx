import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppDatabase } from '../../../src/data/db/appDatabase.js';
import { SqliteCategoryRepository } from '../../../src/data/repositories/sqliteCategoryRepository.js';
import { SqliteExpenseRepository } from '../../../src/data/repositories/sqliteExpenseRepository.js';
import {
  SqliteMonthlyIncomeRepository,
  SqliteInvestmentRepository,
  SqliteReminderRepository,
  SqliteUserAccountRepository,
} from '../../../src/data/repositories/sqliteMonthlyIncomeRepository.js';
import { SqliteConsentRepository } from '../../../src/data/repositories/sqliteConsentRepository.js';
import { SqliteRecurrenceRepository } from '../../../src/data/repositories/sqliteRecurrenceRepository.js';
import { Expense } from '../../../src/domain/models/expense.js';
import { MonthlyOverviewScreen } from '../../../src/features/income/MonthlyOverviewScreen.jsx';
import { CategoryDistributionChart } from '../../../src/features/income/CategoryDistributionChart.jsx';
import { ExpenseFormScreen } from '../../../src/features/expenses/ExpenseFormScreen.jsx';
import { AppShell } from '../../../src/app/AppShell.jsx';
import { CORPORATE_THEME } from '../../../src/core/theme.js';

describe('H5 panel de resumen general del mes, ingreso mensual, inversiones, recordatorios, cuenta local y paleta corporativa', () => {
  let db;
  let categoryRepo;
  let expenseRepo;
  let incomeRepo;
  let investmentRepo;
  let reminderRepo;
  let userAccountRepo;
  let consentRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
    incomeRepo = new SqliteMonthlyIncomeRepository(db);
    investmentRepo = new SqliteInvestmentRepository(db);
    reminderRepo = new SqliteReminderRepository(db);
    userAccountRepo = new SqliteUserAccountRepository(db);
    consentRepo = new SqliteConsentRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('[H5-R1][H5-R2] al registrar el ingreso mensual muestra el ingreso, el balance disponible y el porcentaje que cada categoría representa sobre ese ingreso', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 30000000,
        date: '2026-11-02',
        categoryId: 1,
        note: 'Supermercado',
        createdAt: '2026-11-02T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 15000000,
        date: '2026-11-04',
        categoryId: 3,
        note: 'Servicios',
        createdAt: '2026-11-04T11:00:00',
      }),
    );

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });

    await controller.initialize();
    controller.setIncomeInput('1000000');
    const state = await controller.submitMonthlyIncome();

    assert.equal(state.incomeError, null);
    assert.equal(state.monthlyIncome.amountCents, 100000000);
    assert.equal(state.totalExpensesCents, 45000000);
    assert.equal(state.availableBalanceCents, 55000000);
    assert.equal(state.categoryBreakdown[0].categoryName, 'Alimentos');
    assert.equal(state.categoryBreakdown[0].incomePercentage, 30);
    assert.equal(state.categoryBreakdown[1].categoryName, 'Servicios');
    assert.equal(state.categoryBreakdown[1].incomePercentage, 15);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="overview-income-amount"[^>]*>\$ 1\.000\.000</);
    assert.match(html, /data-testid="overview-expenses-amount"[^>]*>\$ 450\.000</);
    assert.match(html, /data-testid="overview-balance-amount"[^>]*>\$ 550\.000</);
    assert.match(html, /30 % del ingreso/);
    assert.match(html, /15 % del ingreso/);
  });

  it('[H5-R3] sin ingreso mensual cargado el tablero funciona normalmente mostrando gastos e inversiones y omite los porcentajes sobre el ingreso', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 20000000,
        date: '2026-11-03',
        categoryId: 1,
        note: 'Compras del mes',
        createdAt: '2026-11-03T09:00:00',
      }),
    );

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });

    const state = await controller.initialize();
    assert.equal(state.monthlyIncome, null);
    assert.equal(state.totalExpensesCents, 20000000);
    assert.equal(state.categoryBreakdown[0].incomePercentage, null);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /Sin ingreso registrado/);
    assert.match(html, /\$ 200\.000/);
    assert.doesNotMatch(html, /% del ingreso/);
  });

  it('[H5-R4] rechaza ingresos o inversiones con montos vacíos, cero o negativos sin modificar SQLite y muestra el mensaje de error', async () => {
    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
    });

    await controller.initialize();
    for (const bad of ['', '0', '-5000', 'abc']) {
      controller.setIncomeInput(bad);
      const afterBad = await controller.submitMonthlyIncome();
      assert.equal(afterBad.monthlyIncome, null);
      assert.match(afterBad.incomeError, /Ingresá un monto mayor que cero/);
    }

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="income-error"/);
  });

  it('[H5-R5][H5-R6] permite registrar inversiones (activo, plataforma, monto y vencimiento) y recordatorios, reflejándolos junto con los consejos orientativos', async () => {
    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
    });

    await controller.initialize();
    await controller.submitMonthlyIncome('1500000');

    controller.setInvestmentInputs({
      assetName: 'Plazo Fijo 30 días',
      platform: 'Banco Nación',
      amountInput: '500000',
      date: '2026-11-05',
      dueDate: '2026-12-05',
      note: 'TNA 37%',
    });
    const afterInv = await controller.submitInvestment();
    assert.equal(afterInv.investments.length, 1);
    assert.equal(afterInv.totalInvestmentsCents, 50000000);

    const afterRem = await controller.submitReminder({
      title: 'Revisar acreditación de Plazo Fijo',
      dueDate: '2026-12-05',
    });
    assert.equal(afterRem.reminders.length, 1);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /Plazo Fijo 30 días · Banco Nación/);
    assert.match(html, /data-testid="overview-investments-amount"[^>]*>\$ 500\.000</);
    assert.match(html, /Vencimiento de Plazo Fijo 30 días \(Banco Nación\)/);
    assert.match(html, /Revisar acreditación de Plazo Fijo/);
    assert.match(html, /data-testid="monthly-advice-section"/);
    assert.match(html, /carácter exclusivamente orientativo/);
  });

  it('[H5-R7] cuando requireAuth está activo exige registrar o iniciar sesión en la cuenta local antes de acceder al panel de resumen general', async () => {
    const appController = AppShell.createController({
      consentRepository: consentRepo,
      userAccountRepository: userAccountRepo,
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      requireAuth: true,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });

    await appController.initialize();
    const afterConsent = await appController.acceptPrivacyNotice();
    assert.equal(afterConsent.hasConsent, true);
    assert.equal(afterConsent.canAccessMainApp, false);
    assert.equal(afterConsent.view, 'auth');

    const authHtml = renderToStaticMarkup(appController.renderElement());
    assert.match(authHtml, /data-testid="auth-screen"/);
    assert.doesNotMatch(authHtml, /data-testid="monthly-overview-screen"/);

    const afterReg = await appController.registerAccount({
      fullName: 'Juan Pablo',
      username: 'juanpablo',
      password: '1234',
    });
    assert.equal(afterReg.canAccessMainApp, true);
    assert.equal(afterReg.view, 'main');
    assert.equal(afterReg.currentUser.fullName, 'Juan Pablo');

    const mainHtml = renderToStaticMarkup(appController.renderElement());
    assert.match(mainHtml, /data-testid="monthly-overview-screen"/);
    assert.match(mainHtml, /Cuenta activa: Juan Pablo \(@juanpablo\)/);
  });

  it('[H5-R8] aplica la paleta corporativa sobria (azul marino #0F2942 y marrón oscuro #4A3525) y diseño Mobile First (< 768px) con adaptación Desktop (>= 768px)', async () => {
    const mobileStyles = MonthlyOverviewScreen.buildStyles(390);
    assert.equal(mobileStyles.gridColumns, 1);
    assert.equal(mobileStyles.theme.navyPrimary, '#0F2942');
    assert.equal(mobileStyles.theme.brownPrimary, '#4A3525');
    assert.equal(mobileStyles.primaryButton.backgroundColor, CORPORATE_THEME.navyPrimary);
    assert.equal(mobileStyles.brownButton.backgroundColor, CORPORATE_THEME.brownPrimary);
    assert.equal(mobileStyles.primaryButton.minHeight >= 48, true);

    const desktopStyles = MonthlyOverviewScreen.buildStyles(1280);
    assert.equal(desktopStyles.gridColumns, 2);

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 1280,
    });
    await controller.initialize();
    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-layout="desktop"/);
    assert.match(html, /data-columns="2"/);
    assert.match(html, /data-palette="corporate-navy-brown"/);
  });

  it('[H6-R1][H6-R2][H6-R3][H6-R7] el gráfico muestra cada categoría del mes con su monto y su porcentaje sobre el total de gastos, ordenadas de mayor a menor y la suma coincide con el total del listado', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 40000000,
        date: '2026-11-02',
        categoryId: 1,
        note: 'Supermercado',
        createdAt: '2026-11-02T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 20000000,
        date: '2026-11-05',
        categoryId: 1,
        note: 'Verdulería',
        createdAt: '2026-11-05T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 30000000,
        date: '2026-11-06',
        categoryId: 3,
        note: 'Luz y gas',
        createdAt: '2026-11-06T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 10000000,
        date: '2026-11-08',
        categoryId: 2,
        note: 'Combustible',
        createdAt: '2026-11-08T10:00:00',
      }),
    );

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });

    const state = await controller.initialize();
    assert.equal(state.totalExpensesCents, 100000000);
    assert.equal(state.categoryBreakdown.length, 3);
    assert.equal(state.categoryBreakdown[0].categoryName, 'Alimentos');
    assert.equal(state.categoryBreakdown[0].amountCents, 60000000);
    assert.equal(state.categoryBreakdown[0].expenseCount, 2);
    assert.equal(state.categoryBreakdown[0].expensePercentage, 60);
    assert.equal(state.categoryBreakdown[1].categoryName, 'Servicios');
    assert.equal(state.categoryBreakdown[1].amountCents, 30000000);
    assert.equal(state.categoryBreakdown[1].expensePercentage, 30);
    assert.equal(state.categoryBreakdown[2].categoryName, 'Transporte');
    assert.equal(state.categoryBreakdown[2].amountCents, 10000000);
    assert.equal(state.categoryBreakdown[2].expensePercentage, 10);

    const sumCategories = state.categoryBreakdown.reduce(
      (s, c) => s + c.amountCents,
      0,
    );
    assert.equal(sumCategories, state.totalExpensesCents);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="category-distribution-chart"/);
    assert.match(html, /data-testid="category-donut-svg"/);
    assert.match(html, /data-testid="donut-segment-1"/);
    assert.match(html, /60 % del total/);
    assert.match(html, /30 % del total/);
    assert.match(html, /10 % del total/);
    assert.match(html, /data-testid="chart-total-percentage"[^>]*>100 %</);
    assert.match(html, /data-testid="chart-total-amount"[^>]*>\$ 1\.000\.000</);
  });

  it('[H6-R4][H6-R5] con ningún gasto o con un único gasto el tablero presenta un estado coherente y sin errores', async () => {
    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });

    const emptyState = await controller.initialize();
    assert.equal(emptyState.totalExpensesCents, 0);
    assert.equal(emptyState.categoryBreakdown.length, 0);

    const emptyHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(emptyHtml, /data-testid="chart-empty-state"/);
    assert.match(emptyHtml, /data-testid="chart-empty-cta-button"/);
    assert.doesNotMatch(emptyHtml, /NaN|Infinity/);

    await controller.registerExpense(
      new Expense({
        amountCents: 25000000,
        date: '2026-11-04',
        categoryId: 1,
        note: 'Compra única',
        createdAt: '2026-11-04T10:00:00',
      }),
    );

    const singleState = controller.getState();
    assert.equal(singleState.categoryBreakdown.length, 1);
    assert.equal(singleState.categoryBreakdown[0].expensePercentage, 100);
    assert.equal(singleState.categoryBreakdown[0].amountCents, 25000000);

    const singleHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(singleHtml, /data-testid="category-donut-svg"/);
    assert.match(singleHtml, /100 % del total/);
    assert.match(singleHtml, /data-testid="chart-total-amount"[^>]*>\$ 250\.000</);
    assert.doesNotMatch(singleHtml, /NaN|Infinity/);
  });

  it('[H6-R6][H6-R8] recalcula el gráfico inmediatamente al modificar gastos o cambiar de mes y adapta el diseño entre Mobile (< 768px) y Desktop (>= 768px)', async () => {
    const mobileChartStyles = CategoryDistributionChart.buildStyles(390);
    assert.equal(mobileChartStyles.chartBodyGrid.gridTemplateColumns, '1fr');
    assert.equal(mobileChartStyles.emptyCtaButton.minHeight >= 48, true);

    const desktopChartStyles = CategoryDistributionChart.buildStyles(1280);
    assert.equal(
      desktopChartStyles.chartBodyGrid.gridTemplateColumns,
      '188px minmax(0, 1fr)',
    );

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 1280,
    });
    await controller.initialize();

    const { saved: exp1 } = await controller.registerExpense(
      new Expense({
        amountCents: 10000000,
        date: '2026-11-03',
        categoryId: 1,
        createdAt: '2026-11-03T10:00:00',
      }),
    );
    await controller.registerExpense(
      new Expense({
        amountCents: 10000000,
        date: '2026-11-04',
        categoryId: 2,
        createdAt: '2026-11-04T10:00:00',
      }),
    );
    assert.equal(controller.getState().categoryBreakdown[0].expensePercentage, 50);

    await controller.updateExpense(exp1.copyWith({ amountCents: 30000000 }));
    assert.equal(controller.getState().totalExpensesCents, 40000000);
    assert.equal(controller.getState().categoryBreakdown[0].expensePercentage, 75);
    assert.equal(controller.getState().categoryBreakdown[1].expensePercentage, 25);

    await controller.deleteExpense(exp1.id);
    assert.equal(controller.getState().totalExpensesCents, 10000000);
    assert.equal(controller.getState().categoryBreakdown.length, 1);
    assert.equal(controller.getState().categoryBreakdown[0].expensePercentage, 100);

    const prevMonthState = await controller.goToPreviousMonth();
    assert.equal(prevMonthState.activeYearMonth, '2026-10');
    assert.equal(prevMonthState.totalExpensesCents, 0);
    assert.equal(prevMonthState.categoryBreakdown.length, 0);
  });

  it('[H13-R1][H13-R2] la pestaña principal de Resumen (overview) es exclusivamente informativa, entra en el viewport sin scroll vertical (overflowY: hidden) y no renderiza formularios de carga', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 25000000,
        date: '2026-11-03',
        categoryId: 1,
        note: 'Supermercado',
        createdAt: '2026-11-03T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 5000000,
        date: '2026-11-05',
        categoryId: 7,
        note: 'Streaming',
        createdAt: '2026-11-05T10:00:00',
      }),
    );

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });

    await controller.initialize();
    await controller.submitMonthlyIncome('900000');
    controller.setActiveTab('overview');

    const overviewStyles = MonthlyOverviewScreen.buildStyles(390);
    assert.equal(overviewStyles.overviewViewportBox.overflowY, 'hidden');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="overview-viewport-box"/);
    assert.match(html, /data-testid="overview-period-header"/);
    assert.match(html, /data-testid="overview-kpi-grid"/);
    assert.match(html, /data-testid="overview-income-amount"/);
    assert.match(html, /data-testid="overview-expenses-amount"/);
    assert.match(html, /data-testid="overview-investments-amount"/);
    assert.match(html, /data-testid="overview-balance-amount"/);
    assert.match(html, /data-testid="capital-allocation-strip"/);
    assert.match(html, /data-testid="category-distribution-chart"/);
    assert.match(html, /Suscripciones/);
    assert.doesNotMatch(
      html,
      /data-testid="category-breakdown-list"[^>]*overflow:hidden/,
    );

    const chartIndex = html.indexOf('data-testid="category-income-breakdown"');
    const allocationIndex = html.indexOf('data-testid="capital-allocation-strip"');
    assert.equal(chartIndex > -1 && allocationIndex > -1 && chartIndex < allocationIndex, true);

    assert.doesNotMatch(html, /data-testid="monthly-income-form"/);
    assert.doesNotMatch(html, /data-testid="investment-registry-form"/);
    assert.doesNotMatch(html, /data-testid="reminder-form"/);
    assert.doesNotMatch(html, /data-testid="expense-form"/);
  });

  it('[H13-R3] separa cada acción y su listado relacionado en las 5 pestañas dedicadas (Resumen, Gastos, Ingresos, Inversiones y Alertas)', async () => {
    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });

    await controller.initialize();
    await controller.submitMonthlyIncome('1000000');
    controller.setInvestmentInputs({
      assetName: 'CEDEAR SPY',
      platform: 'Balanz',
      amountInput: '200000',
      date: '2026-11-05',
      dueDate: '',
      note: 'Largo plazo',
    });
    await controller.submitInvestment();
    await controller.submitReminder({
      title: 'Pagar tarjeta de crédito',
      dueDate: '2026-11-20',
    });

    controller.setActiveTab('expenses');
    const expensesHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(expensesHtml, /data-testid="tab-panel-expenses"/);
    assert.match(expensesHtml, /data-testid="expense-form"/);
    assert.doesNotMatch(expensesHtml, /data-testid="monthly-income-form"/);
    assert.doesNotMatch(expensesHtml, /data-testid="investment-registry-form"/);
    assert.doesNotMatch(expensesHtml, /data-testid="reminder-form"/);

    controller.setActiveTab('income');
    const incomeHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(incomeHtml, /data-testid="tab-panel-income"/);
    assert.match(incomeHtml, /data-testid="monthly-income-form"/);
    assert.match(incomeHtml, /data-testid="income-absorption-list"/);
    assert.doesNotMatch(incomeHtml, /data-testid="expense-form"/);
    assert.doesNotMatch(incomeHtml, /data-testid="investment-registry-form"/);
    assert.doesNotMatch(incomeHtml, /data-testid="reminder-form"/);

    controller.setActiveTab('investments');
    const investmentsHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(investmentsHtml, /data-testid="tab-panel-investments"/);
    assert.match(investmentsHtml, /data-testid="investment-registry-form"/);
    assert.match(investmentsHtml, /data-testid="investment-list"/);
    assert.match(investmentsHtml, /CEDEAR SPY · Balanz/);
    assert.doesNotMatch(investmentsHtml, /data-testid="expense-form"/);
    assert.doesNotMatch(investmentsHtml, /data-testid="monthly-income-form"/);
    assert.doesNotMatch(investmentsHtml, /data-testid="reminder-form"/);

    controller.setActiveTab('reminders');
    const remindersHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(remindersHtml, /data-testid="tab-panel-reminders"/);
    assert.match(remindersHtml, /data-testid="reminders-section"/);
    assert.match(remindersHtml, /data-testid="reminder-form"/);
    assert.match(remindersHtml, /data-testid="reminders-list"/);
    assert.match(remindersHtml, /data-testid="monthly-advice-section"/);
    assert.doesNotMatch(remindersHtml, /data-testid="expense-form"/);
    assert.doesNotMatch(remindersHtml, /data-testid="monthly-income-form"/);
    assert.doesNotMatch(remindersHtml, /data-testid="investment-registry-form"/);
  });

  it('[H13-R4] presenta las secciones en tarjetas en el borde inferior donde la tarjeta seleccionada cambia de color y se destaca desplazándose hacia arriba (translateY(-8px))', async () => {
    const styles = MonthlyOverviewScreen.buildStyles(390);
    assert.equal(styles.tabsBar.position, 'fixed');
    assert.equal(styles.tabsBar.bottom, 0);
    assert.equal(styles.tabButton.backgroundColor, CORPORATE_THEME.surface);
    assert.equal(styles.tabButton.transform, 'translateY(0px)');
    assert.equal(styles.activeTabButton.backgroundColor, CORPORATE_THEME.brownPrimary);
    assert.equal(styles.activeTabButton.color, '#FFFFFF');
    assert.equal(styles.activeTabButton.transform, 'translateY(-8px)');

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });
    await controller.initialize();
    controller.setActiveTab('investments');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="tab-investments"[^>]*data-active="true"/);
    assert.match(html, /data-testid="tab-overview"[^>]*data-active="false"/);
    assert.match(html, /translateY\(-8px\)/);
  });

  it('[H13-R5][H13-R6][H13-R7] en modo mobile el header no tiene márgenes exteriores y muestra solo el título Ge$tix y el ícono de perfil, desplegando al tocarlo la edición de cuenta, el acceso discreto a privacidad y cerrar sesión', async () => {
    const mobileShellStyles = AppShell.buildStyles(390);
    assert.equal(mobileShellStyles.mainScreen.margin, 0);
    assert.equal(mobileShellStyles.mainScreen.padding, 0);
    assert.equal(mobileShellStyles.header.margin, 0);
    assert.equal(mobileShellStyles.header.borderRadius, 0);

    const appController = AppShell.createController({
      consentRepository: consentRepo,
      userAccountRepository: userAccountRepo,
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      requireAuth: true,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });

    await appController.initialize();
    await appController.acceptPrivacyNotice();
    await appController.registerAccount({
      fullName: 'Juan Pablo',
      username: 'juanpablo',
      password: '1234',
    });

    const closedMenuHtml = renderToStaticMarkup(appController.renderElement());
    assert.match(closedMenuHtml, /data-testid="app-brand-title"[^>]*>Ge\$tix</);
    assert.match(closedMenuHtml, /data-testid="profile-menu-button"/);
    assert.doesNotMatch(closedMenuHtml, /data-testid="profile-menu-popover"/);
    assert.doesNotMatch(closedMenuHtml, /data-testid="open-settings-privacy-button"/);
    assert.doesNotMatch(closedMenuHtml, /data-testid="logout-button"/);

    appController.openProfileMenu();
    const openMenuHtml = renderToStaticMarkup(appController.renderElement());
    assert.match(openMenuHtml, /data-testid="profile-menu-popover"/);
    assert.match(openMenuHtml, /data-testid="profile-edit-form"/);
    assert.match(openMenuHtml, /data-testid="profile-fullname-input"/);
    assert.match(openMenuHtml, /data-testid="profile-username-input"/);
    assert.match(openMenuHtml, /data-testid="profile-save-button"/);
    assert.match(openMenuHtml, /data-testid="open-settings-privacy-button"/);
    assert.match(openMenuHtml, /data-testid="logout-button"/);

    const updatedState = await appController.updateProfile({
      fullName: 'Juan Pablo Simón',
      username: 'jpsimon',
    });
    assert.equal(updatedState.profileError, null);
    assert.equal(updatedState.currentUser.fullName, 'Juan Pablo Simón');
    assert.equal(updatedState.currentUser.username, 'jpsimon');

    const updatedHtml = renderToStaticMarkup(appController.renderElement());
    assert.match(updatedHtml, /Cuenta activa: Juan Pablo Simón \(@jpsimon\)/);

    const afterLogout = appController.logoutAccount();
    assert.equal(afterLogout.currentUser, null);
    assert.equal(afterLogout.view, 'auth');
  });

  it('[H13-R8] aplica alto contraste explícito (fondo #FFFFFF, texto #0B192C, caretColor #0B192C, colorScheme light y borde reforzado) en los campos de monto de gastos, ingresos e inversiones', async () => {
    const expenseStyles = ExpenseFormScreen.buildStyles(390);
    assert.equal(expenseStyles.amountInput.backgroundColor, '#FFFFFF');
    assert.equal(expenseStyles.amountInput.color, '#0B192C');
    assert.equal(expenseStyles.amountInput.caretColor, '#0B192C');
    assert.equal(expenseStyles.amountInput.colorScheme, 'light');
    assert.equal(expenseStyles.amountInput.border, `2px solid ${CORPORATE_THEME.navyPrimary}`);

    const overviewStyles = MonthlyOverviewScreen.buildStyles(390);
    assert.equal(overviewStyles.amountInput.backgroundColor, '#FFFFFF');
    assert.equal(overviewStyles.amountInput.color, '#0B192C');
    assert.equal(overviewStyles.amountInput.caretColor, '#0B192C');
    assert.equal(overviewStyles.amountInput.colorScheme, 'light');
    assert.equal(overviewStyles.amountInput.border, `2px solid ${CORPORATE_THEME.navyPrimary}`);

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth: 390,
    });
    await controller.initialize();

    controller.setActiveTab('expenses');
    const expHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(expHtml, /data-testid="expense-amount-input"[^>]*background-color:#FFFFFF/);
    assert.match(expHtml, /data-testid="expense-amount-input"[^>]*color:#0B192C/);

    controller.setActiveTab('income');
    const incHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(incHtml, /data-testid="income-amount-input"[^>]*background-color:#FFFFFF/);
    assert.match(incHtml, /data-testid="income-amount-input"[^>]*color:#0B192C/);

    controller.setActiveTab('investments');
    const invHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(invHtml, /data-testid="investment-amount-input"[^>]*background-color:#FFFFFF/);
    assert.match(invHtml, /data-testid="investment-amount-input"[^>]*color:#0B192C/);
  });
});

describe('H8 ranking de categorías integrado en la pestaña Gastos', () => {
  let db;
  let categoryRepo;
  let expenseRepo;
  let incomeRepo;
  let investmentRepo;
  let reminderRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
    incomeRepo = new SqliteMonthlyIncomeRepository(db);
    investmentRepo = new SqliteInvestmentRepository(db);
    reminderRepo = new SqliteReminderRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  function createController(viewportWidth = 390) {
    return MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth,
    });
  }

  function rankingRowOrder(html) {
    return [...html.matchAll(/data-testid="category-ranking-row-(\d+)"/g)].map((match) =>
      Number(match[1]),
    );
  }

  async function saveExpense(amountCents, categoryId, date) {
    return expenseRepo.save(
      new Expense({
        amountCents,
        date,
        categoryId,
        createdAt: `${date}T10:00:00`,
      }),
    );
  }

  it('[H8-R6] en la pestaña Gastos muestra el panel del ranking debajo del formulario con todas las categorías del mes en orden, monto y porcentaje', async () => {
    await saveExpense(1500000, 1, '2026-11-02');
    await saveExpense(500000, 1, '2026-11-03');
    await saveExpense(3000000, 3, '2026-11-04');
    await saveExpense(1000000, 2, '2026-11-05');
    await saveExpense(1000000, 5, '2026-11-06');
    await saveExpense(250000, 7, '2026-11-07');
    await saveExpense(1250000, 6, '2026-11-08');
    await saveExpense(900000, 1, '2026-10-20');

    const controller = createController(390);
    await controller.initialize();
    const state = controller.setActiveTab('expenses');

    assert.deepEqual(
      state.categoryRanking.map((item) => [item.position, item.categoryName, item.amountCents]),
      [
        [1, 'Servicios', 3000000],
        [2, 'Alimentos', 2000000],
        [3, 'Delivery', 1250000],
        [4, 'Ocio', 1000000],
        [5, 'Transporte', 1000000],
        [6, 'Suscripciones', 250000],
      ],
    );

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="tab-panel-expenses"/);
    assert.match(html, /data-testid="category-ranking"/);
    assert.deepEqual(rankingRowOrder(html), [3, 1, 6, 5, 2, 7]);
    assert.match(html, /data-testid="category-ranking-amount-3"[^>]*>\$ 30\.000</);
    assert.match(html, /data-testid="category-ranking-pct-3"[^>]*>35\.3 %</);
    assert.match(html, /data-testid="category-ranking-position-7"[^>]*>6°</);

    const formIndex = html.indexOf('data-testid="expense-form"');
    const rankingIndex = html.indexOf('data-testid="category-ranking"');
    assert.equal(formIndex > -1 && rankingIndex > formIndex, true);
  });

  it('[H8-R9] recalcula el ranking al registrar, editar y eliminar gastos y al cambiar de período, sin reiniciar la app', async () => {
    const controller = createController(1280);
    await controller.initialize();
    controller.setActiveTab('expenses');

    const { saved: food } = await controller.registerExpense(
      new Expense({
        amountCents: 100000,
        date: '2026-11-03',
        categoryId: 1,
        createdAt: '2026-11-03T10:00:00',
      }),
    );
    const { state: afterRegister } = await controller.registerExpense(
      new Expense({
        amountCents: 200000,
        date: '2026-11-04',
        categoryId: 2,
        createdAt: '2026-11-04T10:00:00',
      }),
    );
    assert.deepEqual(
      afterRegister.categoryRanking.map((item) => [item.categoryId, item.amountCents]),
      [
        [2, 200000],
        [1, 100000],
      ],
    );
    assert.deepEqual(rankingRowOrder(renderToStaticMarkup(controller.renderElement())), [2, 1]);

    const { state: afterUpdate } = await controller.updateExpense(
      food.copyWith({ amountCents: 500000 }),
    );
    assert.deepEqual(
      afterUpdate.categoryRanking.map((item) => [item.position, item.categoryId, item.amountCents]),
      [
        [1, 1, 500000],
        [2, 2, 200000],
      ],
    );
    const updatedHtml = renderToStaticMarkup(controller.renderElement());
    assert.deepEqual(rankingRowOrder(updatedHtml), [1, 2]);
    assert.match(updatedHtml, /data-testid="category-ranking-amount-1"[^>]*>\$ 5\.000</);

    const afterDelete = await controller.deleteExpense(food.id);
    assert.deepEqual(
      afterDelete.categoryRanking.map((item) => [item.position, item.categoryId]),
      [[1, 2]],
    );
    assert.deepEqual(rankingRowOrder(renderToStaticMarkup(controller.renderElement())), [2]);

    const previousMonth = await controller.goToPreviousMonth();
    assert.equal(previousMonth.activeYearMonth, '2026-10');
    assert.deepEqual(previousMonth.categoryRanking, []);
    const emptyHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(emptyHtml, /data-testid="category-ranking-empty"/);
    assert.doesNotMatch(emptyHtml, /category-ranking-row-/);
  });

  it('[H8-R11] en la pestaña Resumen no renderiza el panel del ranking y conserva la vista sin scroll vertical', async () => {
    await saveExpense(2500000, 1, '2026-11-03');
    await saveExpense(500000, 7, '2026-11-05');

    const controller = createController(390);
    const state = await controller.initialize();
    assert.equal(state.activeTab, 'overview');
    assert.equal(state.categoryRanking.length, 2);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="overview-viewport-box"/);
    assert.match(html, /data-testid="category-distribution-chart"/);
    assert.doesNotMatch(html, /data-testid="category-ranking"/);
    assert.equal(MonthlyOverviewScreen.buildStyles(390).overviewViewportBox.overflowY, 'hidden');
  });
});

describe('H7 comparación mensual integrada en la pestaña Gastos', () => {
  let db;
  let categoryRepo;
  let expenseRepo;
  let incomeRepo;
  let investmentRepo;
  let reminderRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
    incomeRepo = new SqliteMonthlyIncomeRepository(db);
    investmentRepo = new SqliteInvestmentRepository(db);
    reminderRepo = new SqliteReminderRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  function createController(viewportWidth = 390) {
    return MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-10',
      viewportWidth,
    });
  }

  async function saveExpense(amountCents, date, categoryId = 1) {
    return expenseRepo.save(
      new Expense({
        amountCents,
        date,
        categoryId,
        createdAt: `${date}T10:00:00`,
      }),
    );
  }

  function comparisonRowOrder(html) {
    return [...html.matchAll(/data-testid="monthly-comparison-row-(\d{4}-\d{2})"/g)].map(
      (match) => match[1],
    );
  }

  it('[H7-R1] usa el mes seleccionado como mes actual y su total coincide con el total de gastos del período', async () => {
    await saveExpense(300000, '2026-11-02');
    await saveExpense(200000, '2026-10-05');
    await saveExpense(50000, '2026-10-20');
    await saveExpense(400000, '2026-09-15');

    const controller = createController(390);
    const initial = await controller.initialize();
    assert.equal(initial.monthlyComparison.activeYearMonth, '2026-11');
    assert.equal(initial.monthlyComparison.currentTotalCents, initial.totalExpensesCents);
    assert.equal(initial.monthlyComparison.currentTotalCents, 300000);

    const october = await controller.goToPreviousMonth();
    assert.equal(october.activeYearMonth, '2026-10');
    assert.equal(october.monthlyComparison.activeYearMonth, '2026-10');
    assert.equal(october.monthlyComparison.currentTotalCents, october.totalExpensesCents);
    assert.equal(october.monthlyComparison.currentTotalCents, 250000);
    assert.equal(october.monthlyComparison.previousTotalCents, 400000);
    assert.equal(october.monthlyComparison.variationTenths, -375);
  });

  it('[H7-R8] en la pestaña Gastos muestra el panel de comparación debajo del ranking con el total de noviembre, las filas de octubre y septiembre y la variación', async () => {
    await saveExpense(412500, '2026-11-03');
    await saveExpense(389000, '2026-10-12');
    await saveExpense(150050, '2026-09-08', 3);

    const controller = createController(390);
    await controller.initialize();
    const state = controller.setActiveTab('expenses');
    assert.equal(state.monthlyComparison.hasPreviousData, true);
    assert.equal(state.monthlyComparison.variationTenths, 60);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="tab-panel-expenses"/);
    assert.match(html, /data-testid="monthly-comparison"/);
    assert.match(html, /data-testid="monthly-comparison-current"[^>]*>\$ 4\.125</);
    assert.deepEqual(comparisonRowOrder(html), ['2026-10', '2026-09']);
    assert.match(html, /Octubre 2026 \(2026-10\)<\/span><strong[^>]*>\$ 3\.890</);
    assert.match(html, /Septiembre 2026 \(2026-09\)<\/span><strong[^>]*>\$ 1\.500,50</);
    assert.match(html, /data-testid="monthly-comparison-variation"[^>]*>\+6,0 %</);

    const rankingIndex = html.indexOf('data-testid="category-ranking"');
    const comparisonIndex = html.indexOf('data-testid="monthly-comparison"');
    assert.equal(rankingIndex > -1 && comparisonIndex > rankingIndex, true);
  });

  it('[H7-R12] recalcula la comparación al registrar, editar, eliminar gastos y al cambiar de período, sin reiniciar la app', async () => {
    await saveExpense(100000, '2026-10-05');

    const controller = createController(1280);
    await controller.initialize();
    controller.setActiveTab('expenses');

    const { saved: november } = await controller.registerExpense(
      new Expense({
        amountCents: 150000,
        date: '2026-11-04',
        categoryId: 2,
        createdAt: '2026-11-04T10:00:00',
      }),
    );
    const afterRegister = controller.getState().monthlyComparison;
    assert.equal(afterRegister.currentTotalCents, 150000);
    assert.equal(afterRegister.variationTenths, 500);
    assert.match(
      renderToStaticMarkup(controller.renderElement()),
      /data-testid="monthly-comparison-variation"[^>]*>\+50,0 %</,
    );

    const { state: afterUpdate } = await controller.updateExpense(
      november.copyWith({ date: '2026-10-20' }),
    );
    assert.equal(afterUpdate.monthlyComparison.currentTotalCents, 0);
    assert.equal(afterUpdate.monthlyComparison.previousTotalCents, 250000);
    assert.equal(afterUpdate.monthlyComparison.variationTenths, -1000);
    const updatedHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(updatedHtml, /data-testid="monthly-comparison-current"[^>]*>\$ 0</);
    assert.match(updatedHtml, /Octubre 2026 \(2026-10\)<\/span><strong[^>]*>\$ 2\.500</);
    assert.match(updatedHtml, /data-testid="monthly-comparison-variation"[^>]*>-100,0 %</);

    const afterDelete = await controller.deleteExpense(november.id);
    assert.equal(afterDelete.monthlyComparison.previousTotalCents, 100000);
    assert.match(
      renderToStaticMarkup(controller.renderElement()),
      /Octubre 2026 \(2026-10\)<\/span><strong[^>]*>\$ 1\.000</,
    );

    const october = await controller.goToPreviousMonth();
    assert.equal(october.monthlyComparison.activeYearMonth, '2026-10');
    assert.equal(october.monthlyComparison.currentTotalCents, 100000);
    assert.equal(october.monthlyComparison.hasPreviousData, false);
    const emptyHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(emptyHtml, /data-testid="monthly-comparison-empty"/);
    assert.doesNotMatch(emptyHtml, /monthly-comparison-row-/);
  });

  it('[H7-R13] en la pestaña Resumen no renderiza el panel de comparación y conserva la vista sin scroll vertical', async () => {
    await saveExpense(250000, '2026-11-03');
    await saveExpense(200000, '2026-10-03');

    const controller = createController(390);
    const state = await controller.initialize();
    assert.equal(state.activeTab, 'overview');
    assert.equal(state.monthlyComparison.hasPreviousData, true);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="overview-viewport-box"/);
    assert.doesNotMatch(html, /data-testid="monthly-comparison"/);
    assert.equal(MonthlyOverviewScreen.buildStyles(390).overviewViewportBox.overflowY, 'hidden');
  });
});

describe('H9 recurrencias en la pestaña Alertas', () => {
  let db;
  let categoryRepo;
  let expenseRepo;
  let recurrenceRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
    recurrenceRepo = new SqliteRecurrenceRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  function createController(viewportWidth = 390) {
    return MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: new SqliteMonthlyIncomeRepository(db),
      investmentRepository: new SqliteInvestmentRepository(db),
      reminderRepository: new SqliteReminderRepository(db),
      recurrenceRepository: recurrenceRepo,
      today: () => '2026-10-31',
      viewportWidth,
    });
  }

  async function saveRecurringSubscriptions() {
    const categories = await categoryRepo.findAll();
    const subscriptionsId = categories.find((c) => c.name === 'Suscripciones').id;
    for (const date of ['2026-09-05', '2026-10-05', '2026-10-28']) {
      await expenseRepo.save(
        new Expense({
          amountCents: 650000,
          date,
          categoryId: subscriptionsId,
          createdAt: `${date}T10:00:00`,
        }),
      );
    }
    return subscriptionsId;
  }

  it('[H9-R8] la pestaña Alertas muestra la recurrencia y la pestaña Resumen no renderiza el panel', async () => {
    const subscriptionsId = await saveRecurringSubscriptions();
    const controller = createController(1280);
    const state = await controller.initialize();
    assert.equal(state.recurrences.length, 1);
    assert.equal(state.recurrences[0].key, `${subscriptionsId}|650000`);

    const overviewHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(overviewHtml, /data-testid="overview-viewport-box"/);
    assert.doesNotMatch(overviewHtml, /data-testid="recurrences-panel"/);

    controller.setActiveTab('reminders');
    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="tab-panel-reminders"/);
    assert.match(html, /data-testid="recurrences-panel" data-layout="desktop"/);
    assert.match(html, /data-testid="recurrence-category"[^>]*>Suscripciones</);
    assert.match(html, /data-testid="recurrence-amount"[^>]*>\$ 6\.500</);
    assert.match(html, /3 veces en 60 días/);
    const remindersIndex = html.indexOf('data-testid="reminders-section"');
    const panelIndex = html.indexOf('data-testid="recurrences-panel"');
    assert.equal(remindersIndex > -1 && panelIndex > remindersIndex, true);
  });

  it('[H9-R7] al descartar guarda la clave en el repositorio y la recurrencia deja de mostrarse', async () => {
    const subscriptionsId = await saveRecurringSubscriptions();
    const controller = createController(390);
    await controller.initialize();
    const key = `${subscriptionsId}|650000`;

    const state = await controller.dismissRecurrence(key);
    assert.equal((await recurrenceRepo.dismissedKeys()).has(key), true);
    assert.deepEqual(state.recurrences, []);
    assert.equal(state.recurrenceError, null);

    await controller.goToPreviousMonth();
    assert.deepEqual(controller.getState().recurrences, []);

    controller.setActiveTab('reminders');
    const html = renderToStaticMarkup(controller.renderElement());
    assert.doesNotMatch(html, /data-testid="recurrence-item"/);
    assert.match(html, /data-testid="recurrences-empty"/);
  });

  it('[H9-R7] si falla el descarte muestra el error y la recurrencia sigue visible', async () => {
    await saveRecurringSubscriptions();
    const failingRepo = {
      dismissedKeys: async () => new Set(),
      dismiss: async () => {
        throw new Error('disco lleno');
      },
    };
    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      recurrenceRepository: failingRepo,
      today: () => '2026-10-31',
    });
    await controller.initialize();
    const state = await controller.dismissRecurrence(controller.getState().recurrences[0].key);
    assert.equal(state.recurrences.length, 1);
    assert.equal(state.recurrenceError, 'No se pudo descartar la recurrencia. Probá de nuevo.');

    controller.setActiveTab('reminders');
    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="recurrences-error" role="alert"/);
    assert.match(html, /data-testid="recurrence-item"/);
  });

  it('[H9-R9] sin gastos la pestaña Alertas muestra el estado vacío de recurrencias', async () => {
    const controller = createController(390);
    await controller.initialize();
    controller.setActiveTab('reminders');
    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="recurrences-panel" data-layout="mobile"/);
    assert.match(html, /data-testid="recurrences-empty"/);
    assert.match(html, /Todavía no detectamos gastos repetidos en los últimos 60 días\./);
    assert.doesNotMatch(html, /data-testid="recurrences-list"/);
  });
});

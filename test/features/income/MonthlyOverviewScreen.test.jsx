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
import { SqliteAdviceRequestRepository } from '../../../src/data/repositories/sqliteAdviceRequestRepository.js';
import { ADVICE_DISCLAIMER } from '../../../src/assistant/adviceResponse.js';
import { FakeLlmClient } from '../../assistant/fakeLlmClient.js';

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

    const compactMobileChartStyles = CategoryDistributionChart.buildStyles(390, true);
    assert.equal(compactMobileChartStyles.card.height, 330);
    assert.equal(compactMobileChartStyles.card.maxHeight, 330);
    assert.equal(compactMobileChartStyles.breakdownList.overflowY, 'auto');
    assert.equal(compactMobileChartStyles.breakdownList.maxHeight, 190);

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
    assert.match(openMenuHtml, /data-testid="open-profile-page-button"/);
    assert.match(openMenuHtml, /data-testid="open-settings-privacy-button"/);
    assert.match(openMenuHtml, /data-testid="logout-button"/);

    appController.openProfilePage();
    const profilePageHtml = renderToStaticMarkup(appController.renderElement());
    assert.match(profilePageHtml, /data-testid="user-profile-screen"/);
    assert.match(profilePageHtml, /data-testid="profile-edit-form"/);
    assert.match(profilePageHtml, /data-testid="profile-fullname-input"/);
    assert.match(profilePageHtml, /data-testid="profile-username-input"/);
    assert.match(profilePageHtml, /data-testid="profile-save-button"/);

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

describe('H10 recomendaciones del asistente en la pestaña Alertas', () => {
  let db;
  let categoryRepo;
  let expenseRepo;
  let incomeRepo;
  let recurrenceRepo;
  let adviceRequestRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
    incomeRepo = new SqliteMonthlyIncomeRepository(db);
    recurrenceRepo = new SqliteRecurrenceRepository(db);
    adviceRequestRepo = new SqliteAdviceRequestRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  function createController(llmClient, viewportWidth = 390) {
    return MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      recurrenceRepository: recurrenceRepo,
      adviceRequestRepository: adviceRequestRepo,
      llmClient,
      today: () => '2026-11-15',
      now: () => new Date(2026, 10, 15, 10, 0, 0),
      viewportWidth,
    });
  }

  async function saveNovemberExpenses() {
    const categories = await categoryRepo.findAll();
    const deliveryId = categories.find((c) => c.name === 'Delivery').id;
    const foodId = categories.find((c) => c.name === 'Alimentos').id;
    await expenseRepo.save(
      new Expense({ amountCents: 450000, date: '2026-11-05', categoryId: deliveryId, createdAt: '2026-11-05T10:00:00' }),
    );
    await expenseRepo.save(
      new Expense({ amountCents: 980000, date: '2026-11-08', categoryId: foodId, createdAt: '2026-11-08T10:00:00' }),
    );
  }

  const TWO_SUGGESTIONS = JSON.stringify({
    sugerencias: [
      { titulo: 'Bajá el delivery', detalle: 'Probá cocinar dos veces por semana.', categoria: 'Delivery' },
      { titulo: 'Poné un tope', detalle: 'Definí un monto para el súper.', categoria: 'Alimentos' },
    ],
  });

  it('[H10-R33] el panel de recomendaciones se abre desde el botón Consejos Agente en Resumen y no se renderiza en Alertas', async () => {
    const controller = createController(FakeLlmClient.succeeding(TWO_SUGGESTIONS));
    await controller.initialize();

    const overviewHtml = renderToStaticMarkup(controller.renderElement());
    assert.doesNotMatch(overviewHtml, /data-testid="recommendations-panel"/);
    assert.match(overviewHtml, /data-testid="open-agent-advice-modal-button"[^>]*>Consejos Agente</);
    assert.equal((overviewHtml.match(/data-testid="tab-[a-z]+"/g) ?? []).length, 5);

    controller.openAdviceModal();
    const modalHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(modalHtml, /data-testid="agent-advice-modal"/);
    assert.match(modalHtml, /data-testid="recommendations-panel"/);
    controller.closeAdviceModal();

    controller.setActiveTab('reminders');
    const html = renderToStaticMarkup(controller.renderElement());
    const recurrencesIndex = html.indexOf('data-testid="recurrences-panel"');
    assert.equal(recurrencesIndex > -1, true);
    assert.doesNotMatch(html, /data-testid="recommendations-panel"/);
    assert.match(html, /data-testid="monthly-advice-section"/);
    assert.equal((html.match(/data-testid="tab-[a-z]+"/g) ?? []).length, 5);
  });

  it('[H10-R9] abrir la pantalla y el modal Consejos Agente no invoca al asistente', async () => {
    await saveNovemberExpenses();
    const fake = FakeLlmClient.succeeding(TWO_SUGGESTIONS);
    const controller = createController(fake);
    await controller.initialize();
    controller.openAdviceModal();
    const html = renderToStaticMarkup(controller.renderElement());
    assert.equal(fake.calls.length, 0);
    assert.equal(controller.getState().advice.status, 'idle');
    assert.match(html, /Te quedan 10 de 10 consultas al asistente hoy/);
    assert.match(html, /data-testid="recommendations-request-button"/);
    assert.equal(await adviceRequestRepo.countByDate('2026-11-15', 'model'), 0);
  });

  it('[H10-R10] al pedir recomendaciones con gastos muestra las 2 sugerencias del modelo con la advertencia', async () => {
    await saveNovemberExpenses();
    const fake = FakeLlmClient.succeeding(TWO_SUGGESTIONS);
    const controller = createController(fake, 1280);
    await controller.initialize();
    controller.openAdviceModal();

    const state = await controller.requestAdvice();
    assert.equal(fake.calls.length, 1);
    assert.equal(state.advice.status, 'ready');
    assert.equal(state.advice.source, 'model');
    assert.equal(state.advice.suggestions.length, 2);
    assert.equal(state.advice.remainingModelRequests, 9);
    const sent = JSON.parse(fake.calls[0].userContent);
    assert.equal(sent.periodo, '2026-11');
    assert.equal(sent.total_mes, 14300);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.equal((html.match(/data-testid="recommendation-item"/g) ?? []).length, 2);
    assert.match(html, /data-testid="recommendations-source" data-source="model"/);
    assert.match(html, /data-testid="recommendations-disclaimer"/);
    assert.equal(html.includes(ADVICE_DISCLAIMER), true);
    assert.match(html, /data-testid="recommendations-list" data-columns="2"/);
    assert.match(html, /Te quedan 9 de 10 consultas al asistente hoy/);
  });

  it('[H10-R19] con una respuesta mal formada el modal muestra la reserva marcada como generada por reglas sin descontar el intento diario', async () => {
    await saveNovemberExpenses();
    const controller = createController(FakeLlmClient.malformed());
    await controller.initialize();
    controller.openAdviceModal();
    const state = await controller.requestAdvice();
    assert.equal(state.advice.source, 'fallback');
    assert.equal(state.advice.reason, 'invalid_response');
    assert.equal(state.advice.remainingModelRequests, 10);

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="recommendations-source" data-source="fallback"/);
    assert.match(html, /Sugerencias generadas por reglas/);
    assert.equal(html.includes(ADVICE_DISCLAIMER), true);
  });

  it('[H10-R26] el contador de consultas se actualiza al cambiar de mes y la solicitud vuelve a idle', async () => {
    await saveNovemberExpenses();
    const controller = createController(FakeLlmClient.succeeding(TWO_SUGGESTIONS));
    await controller.initialize();
    await controller.requestAdvice();
    const state = await controller.goToPreviousMonth();
    assert.equal(state.advice.status, 'idle');
    assert.equal(state.advice.remainingModelRequests, 9);
  });
});

describe('H11 exportación del historial en la pestaña Gastos', () => {
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

  function createFakeDelivery() {
    const calls = [];
    return {
      calls,
      canShare: () => false,
      async download(payload) {
        calls.push({ method: 'download', ...payload });
      },
      async share(payload) {
        calls.push({ method: 'share', ...payload });
        return 'shared';
      },
    };
  }

  function createController(csvDelivery, viewportWidth = 390) {
    return MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: new SqliteMonthlyIncomeRepository(db),
      investmentRepository: new SqliteInvestmentRepository(db),
      reminderRepository: new SqliteReminderRepository(db),
      recurrenceRepository: new SqliteRecurrenceRepository(db),
      csvDelivery,
      today: () => '2026-11-15',
      viewportWidth,
    });
  }

  async function saveOctoberAndNovemberExpenses() {
    const categories = await categoryRepo.findAll();
    const foodId = categories.find((c) => c.name === 'Alimentos').id;
    const leisureId = categories.find((c) => c.name === 'Ocio').id;
    await expenseRepo.save(
      new Expense({
        amountCents: 650000,
        date: '2026-10-05',
        categoryId: leisureId,
        note: 'Cine',
        createdAt: '2026-10-05T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 123456,
        date: '2026-11-03',
        categoryId: foodId,
        createdAt: '2026-11-03T10:00:00',
      }),
    );
  }

  it('[H11-R23] en la pestaña Gastos muestra el panel de exportación al final, después de la comparación mensual', async () => {
    const controller = createController(createFakeDelivery());
    await controller.initialize();
    controller.setActiveTab('expenses');

    const html = renderToStaticMarkup(controller.renderElement());
    const panelStart = html.indexOf('data-testid="tab-panel-expenses"');
    const comparisonIndex = html.indexOf('data-testid="monthly-comparison"');
    const exportIndex = html.indexOf('data-testid="export-history-panel"');

    assert.ok(panelStart >= 0);
    assert.ok(comparisonIndex > panelStart);
    assert.ok(exportIndex > comparisonIndex);
    assert.match(html, /data-testid="export-download-button"/);
    assert.doesNotMatch(html, /data-testid="export-share-button"/);
  });

  it('[H11-R24] la pestaña Resumen y el header no muestran el panel ni los botones de exportación', async () => {
    const controller = createController(createFakeDelivery());
    await controller.initialize();
    const overviewHtml = renderToStaticMarkup(controller.renderElement());
    assert.doesNotMatch(overviewHtml, /data-testid="export-history-panel"/);
    assert.doesNotMatch(overviewHtml, /data-testid="export-download-button"/);

    const appController = AppShell.createController({
      consentRepository: new SqliteConsentRepository(db),
      userAccountRepository: new SqliteUserAccountRepository(db),
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: new SqliteMonthlyIncomeRepository(db),
      investmentRepository: new SqliteInvestmentRepository(db),
      reminderRepository: new SqliteReminderRepository(db),
      requireAuth: true,
      today: () => '2026-11-15',
      viewportWidth: 390,
    });
    await appController.initialize();
    await appController.acceptPrivacyNotice();
    await appController.registerAccount({
      fullName: 'Juan Pablo',
      username: 'juanpablo',
      password: '1234',
    });

    const shellHtml = renderToStaticMarkup(appController.renderElement());
    const headerStart = shellHtml.indexOf('data-testid="app-header"');
    assert.ok(headerStart >= 0);
    const headerHtml = shellHtml.slice(headerStart, shellHtml.indexOf('</header>', headerStart));
    assert.doesNotMatch(headerHtml, /export-/);
    assert.doesNotMatch(headerHtml, /Exportar/);
    assert.doesNotMatch(shellHtml, /data-testid="export-history-panel"/);
  });

  it('[H11-R1] exporta los gastos de octubre y noviembre aunque el período activo sea noviembre', async () => {
    await saveOctoberAndNovemberExpenses();
    const delivery = createFakeDelivery();
    const controller = createController(delivery);
    await controller.initialize();
    assert.equal(controller.getState().expenses.length, 1);

    const state = await controller.exportHistory('download');

    assert.equal(state.exportState.status, 'done');
    assert.equal(delivery.calls.length, 1);
    assert.equal(delivery.calls[0].fileName, 'gestix_gastos_2026-11-15.csv');
    const { content } = delivery.calls[0];
    assert.match(content, /\r\n2026-10-05;6500,00;Ocio;;Cine\r\n/);
    assert.match(content, /\r\n2026-11-03;1234,56;Alimentos;;\r\n/);

    controller.setActiveTab('expenses');
    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="export-message"/);
  });

  it('[H11-R15] el mensaje renderizado muestra la cantidad de gastos y el total en pesos', async () => {
    await saveOctoberAndNovemberExpenses();
    const controller = createController(createFakeDelivery(), 1280);
    await controller.initialize();
    await controller.exportHistory();
    controller.setActiveTab('expenses');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(
      html,
      /data-testid="export-message"[^>]*>Se exportaron 2 gastos por un total de \$ 7\.734,56\.</,
    );
  });
});

describe('H14 refactor UX/UI Desktop, paleta vibrante de gráfico y página dedicada de perfil', () => {
  let db;
  let consentRepo;
  let userAccountRepo;
  let categoryRepo;
  let expenseRepo;
  let incomeRepo;
  let investmentRepo;
  let reminderRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    consentRepo = new SqliteConsentRepository(db);
    userAccountRepo = new SqliteUserAccountRepository(db);
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

  it('[H14-R1][H14-R2] en Desktop el navbar ocupa el 100 % del ancho e integra las 5 pestañas en la barra superior sin dock fijo inferior, conservando las tarjetas inferiores fijas en Mobile', async () => {
    const desktopShellStyles = AppShell.buildStyles(1280);
    assert.equal(desktopShellStyles.mainScreen.width, '100%');
    assert.equal(desktopShellStyles.mainScreen.maxWidth, '100%');
    assert.equal(desktopShellStyles.header.width, '100%');
    assert.equal(desktopShellStyles.header.borderRadius, 0);

    const desktopOverviewStyles = MonthlyOverviewScreen.buildStyles(1280);
    assert.equal(desktopOverviewStyles.tabsBar.position, 'static');

    const mobileOverviewStyles = MonthlyOverviewScreen.buildStyles(390);
    assert.equal(mobileOverviewStyles.tabsBar.position, 'fixed');
    assert.equal(mobileOverviewStyles.tabsBar.bottom, 0);
    assert.equal(mobileOverviewStyles.activeTabButton.transform, 'translateY(-8px)');

    const desktopApp = AppShell.createController({
      consentRepository: consentRepo,
      userAccountRepository: userAccountRepo,
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      requireAuth: true,
      today: () => '2026-11-15',
      viewportWidth: 1280,
    });
    await desktopApp.initialize();
    await desktopApp.acceptPrivacyNotice();
    await desktopApp.registerAccount({
      fullName: 'Juan Pablo',
      username: 'juanpablo',
      password: '1234',
    });

    const desktopHtml = renderToStaticMarkup(desktopApp.renderElement());
    const headerStart = desktopHtml.indexOf('data-testid="app-header"');
    const headerEnd = desktopHtml.indexOf('</header>', headerStart);
    const headerHtml = desktopHtml.slice(headerStart, headerEnd);
    assert.match(headerHtml, /data-testid="overview-tabs"/);
    assert.match(headerHtml, /data-nav-placement="header"/);
    assert.match(headerHtml, /data-testid="tab-overview"/);
    assert.match(headerHtml, /data-testid="tab-expenses"/);
    assert.match(headerHtml, /data-testid="tab-income"/);
    assert.match(headerHtml, /data-testid="tab-investments"/);
    assert.match(headerHtml, /data-testid="tab-reminders"/);
    assert.equal([...desktopHtml.matchAll(/data-testid="overview-tabs"/g)].length, 1);

    const mobileApp = AppShell.createController({
      consentRepository: consentRepo,
      userAccountRepository: userAccountRepo,
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      requireAuth: false,
      today: () => '2026-11-15',
      viewportWidth: 390,
    });
    await mobileApp.initialize();
    const mobileHtml = renderToStaticMarkup(mobileApp.renderElement());
    const mobileHeaderStart = mobileHtml.indexOf('data-testid="app-header"');
    const mobileHeaderEnd = mobileHtml.indexOf('</header>', mobileHeaderStart);
    const mobileHeaderHtml = mobileHtml.slice(mobileHeaderStart, mobileHeaderEnd);
    assert.doesNotMatch(mobileHeaderHtml, /data-testid="overview-tabs"/);
    assert.match(mobileHtml, /data-testid="overview-tabs"[^>]*data-nav-placement="bottom"/);
  });

  it('[H14-R3][H14-R4][H14-R5] en Desktop el contenedor principal ocupa el 80 % del ancho sin scroll vertical en Resumen, amplía el gráfico con colores vibrantes y muestra los tres paneles informativos complementarios', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 4200000,
        date: '2026-11-04',
        categoryId: 1,
        note: 'Supermercado',
        createdAt: '2026-11-04T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 1800000,
        date: '2026-10-12',
        categoryId: 1,
        note: 'Octubre',
        createdAt: '2026-10-12T10:00:00',
      }),
    );
    await reminderRepo.save({
      title: 'Vencimiento tarjeta Visa',
      dueDate: '2026-11-24',
      createdAt: '2026-11-01T10:00:00',
    });

    const desktopStyles = MonthlyOverviewScreen.buildStyles(1280);
    assert.equal(desktopStyles.wrapper.width, '80%');
    assert.equal(desktopStyles.wrapper.maxWidth, 1440);
    assert.equal(desktopStyles.overviewViewportBox.overflowY, 'hidden');
    assert.equal(desktopStyles.kpiGrid.flexShrink, 0);

    const compactChartDesktopStyles = CategoryDistributionChart.buildStyles(1280, true);
    assert.equal(compactChartDesktopStyles.card.height, 310);
    assert.equal(compactChartDesktopStyles.card.maxHeight, 310);
    assert.equal(compactChartDesktopStyles.donutContainer.flexShrink, 0);
    assert.equal(compactChartDesktopStyles.breakdownList.overflowY, 'auto');
    assert.equal(compactChartDesktopStyles.breakdownList.maxHeight, 186);

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-15',
      viewportWidth: 1280,
    });
    await controller.initialize();
    await controller.submitMonthlyIncome('15000000');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="desktop-overview-grid"/);
    assert.match(html, /data-testid="category-donut-svg"[^>]*width="212"[^>]*height="212"/);
    assert.match(html, /stroke="#2563EB"/);
    assert.match(html, /data-testid="desktop-overview-insights"/);
    assert.match(html, /data-testid="desktop-insight-pulse"/);
    assert.match(html, /data-testid="desktop-insight-recent"/);
    assert.match(html, /data-testid="desktop-insight-alerts"/);
    assert.match(html, /Vencimiento tarjeta Visa/);
    assert.doesNotMatch(html, /data-testid="monthly-income-form"/);
    assert.doesNotMatch(html, /data-testid="expense-form"/);
  });

  it('[H14-R6][H14-R7][H14-R8][H14-R9] el menú de usuario abre la página dedicada de perfil donde edita sus datos y cambia su contraseña validando la clave actual y el largo mínimo', async () => {
    const appController = AppShell.createController({
      consentRepository: consentRepo,
      userAccountRepository: userAccountRepo,
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      requireAuth: true,
      today: () => '2026-11-15',
      viewportWidth: 1280,
    });

    await appController.initialize();
    await appController.acceptPrivacyNotice();
    await appController.registerAccount({
      fullName: 'Juan Pablo',
      username: 'juanpablo',
      password: '1234',
    });

    appController.openProfileMenu();
    const menuHtml = renderToStaticMarkup(appController.renderElement());
    assert.match(menuHtml, /data-testid="profile-menu-popover"/);
    assert.match(menuHtml, /data-testid="open-profile-page-button"/);
    assert.doesNotMatch(menuHtml, /data-testid="profile-edit-form"/);

    const profileState = appController.openProfilePage();
    assert.equal(profileState.view, 'profile');
    assert.equal(profileState.isProfileMenuOpen, false);

    const profileHtml = renderToStaticMarkup(appController.renderElement());
    assert.match(profileHtml, /data-testid="user-profile-screen"/);
    assert.match(profileHtml, /data-testid="profile-edit-form"/);
    assert.match(profileHtml, /data-testid="profile-password-form"/);
    assert.match(profileHtml, /data-testid="close-profile-page-button"/);

    const wrongCurrentState = await appController.changePassword({
      currentPassword: '9999',
      newPassword: 'nuevaClave',
    });
    assert.equal(wrongCurrentState.passwordError, 'La clave actual es incorrecta');
    assert.match(
      renderToStaticMarkup(appController.renderElement()),
      /data-testid="profile-password-error"/,
    );

    const shortNewState = await appController.changePassword({
      currentPassword: '1234',
      newPassword: '12',
    });
    assert.equal(
      shortNewState.passwordError,
      'La nueva clave debe tener al menos 4 caracteres',
    );

    const changedState = await appController.changePassword({
      currentPassword: '1234',
      newPassword: 'claveSegura2026',
    });
    assert.equal(changedState.passwordError, null);
    assert.equal(
      changedState.passwordSuccess,
      'Contraseña actualizada correctamente.',
    );
    assert.match(
      renderToStaticMarkup(appController.renderElement()),
      /data-testid="profile-password-success"/,
    );

    const backMainState = appController.closeProfilePage();
    assert.equal(backMainState.view, 'main');

    appController.logoutAccount();
    const reloginOld = await appController.loginAccount({
      username: 'juanpablo',
      password: '1234',
    });
    assert.equal(reloginOld.currentUser, null);
    assert.equal(reloginOld.authError, 'Usuario o clave incorrectos');

    const reloginNew = await appController.loginAccount({
      username: 'juanpablo',
      password: 'claveSegura2026',
    });
    assert.equal(reloginNew.currentUser.username, 'juanpablo');
    assert.equal(reloginNew.view, 'main');
  });
});

describe('H15 múltiples ingresos en cualquier momento con suma acumulada mensual', () => {
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

  it('[H15-R6][H15-R7][H15-R8] permite cargar múltiples ingresos con fecha y concepto en la pestaña Ingresos, acumula su suma en el ingreso mensual y recalcula todo al editar o eliminar un ingreso', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 30000000,
        date: '2026-11-05',
        categoryId: 1,
        note: 'Supermercado',
        createdAt: '2026-11-05T10:00:00',
      }),
    );

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      investmentRepository: investmentRepo,
      reminderRepository: reminderRepo,
      today: () => '2026-11-15',
      viewportWidth: 1280,
    });

    await controller.initialize();
    controller.setActiveTab('income');

    const initialIncomeHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(initialIncomeHtml, /data-testid="income-amount-input"/);
    assert.match(initialIncomeHtml, /data-testid="income-date-input"[^>]*value="2026-11-15"/);
    assert.match(initialIncomeHtml, /data-testid="income-note-input"/);
    assert.match(initialIncomeHtml, /data-testid="income-entries-empty"/);

    controller.setIncomeInputs({
      amountInput: '1000000',
      date: '2026-11-02',
      note: 'Sueldo neto',
    });
    const afterFirst = await controller.submitMonthlyIncome();
    assert.equal(afterFirst.monthlyIncome.amountCents, 100000000);
    assert.equal(afterFirst.incomeEntries.length, 1);
    assert.equal(afterFirst.incomeInput, '');
    assert.equal(afterFirst.incomeNoteInput, '');

    controller.setIncomeInputs({
      amountInput: '500000',
      date: '2026-11-14',
      note: 'Cobro freelance',
    });
    const afterSecond = await controller.submitMonthlyIncome();
    assert.equal(afterSecond.monthlyIncome.amountCents, 150000000);
    assert.equal(afterSecond.availableBalanceCents, 120000000);
    assert.equal(afterSecond.incomeEntries.length, 2);
    assert.equal(afterSecond.categoryBreakdown[0].incomePercentage, 20);

    const listHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(listHtml, /data-testid="income-entries-list"/);
    assert.match(listHtml, /Sueldo neto/);
    assert.match(listHtml, /Cobro freelance/);
    assert.match(listHtml, /\$ 1\.500\.000/);
    assert.match(listHtml, /20 % del ingreso/);

    const secondEntryId = afterSecond.incomeEntries[0].id;
    controller.startEditIncomeEntry(secondEntryId);
    controller.setIncomeInputs({
      amountInput: '200000',
      date: '2026-11-14',
      note: 'Cobro freelance ajustado',
    });
    const afterEdit = await controller.submitMonthlyIncome();
    assert.equal(afterEdit.monthlyIncome.amountCents, 120000000);
    assert.equal(afterEdit.availableBalanceCents, 90000000);
    assert.equal(afterEdit.categoryBreakdown[0].incomePercentage, 25);

    const firstEntryId = afterEdit.incomeEntries[1].id;
    const afterDelete = await controller.deleteIncomeEntry(firstEntryId);
    assert.equal(afterDelete.incomeEntries.length, 1);
    assert.equal(afterDelete.monthlyIncome.amountCents, 20000000);
  });
});

describe('H16 botón Consejos Agente al pie del Resumen y modal con persistencia del último consejo del día', () => {
  let db;
  let categoryRepo;
  let expenseRepo;
  let incomeRepo;
  let recurrenceRepo;
  let adviceRequestRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
    incomeRepo = new SqliteMonthlyIncomeRepository(db);
    recurrenceRepo = new SqliteRecurrenceRepository(db);
    adviceRequestRepo = new SqliteAdviceRequestRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  const SAMPLE_SUGGESTIONS = JSON.stringify({
    sugerencias: [
      {
        titulo: 'Controlá compras semanales',
        detalle: 'Concentrá el supermercado en una sola compra mayorista.',
        categoria: 'Alimentos',
      },
    ],
  });

  it('[H16-R1][H16-R2][H16-R7] muestra el botón Consejos Agente debajo de todo en Resumen sin scroll vertical, quita el panel de Alertas y abre/cierra el modal en Mobile y Desktop', async () => {
    const mobileStyles = MonthlyOverviewScreen.buildStyles(390);
    assert.equal(mobileStyles.overviewViewportBox.overflowY, 'hidden');
    assert.equal(mobileStyles.agentAdviceButton.minHeight >= 38, true);

    const desktopStyles = MonthlyOverviewScreen.buildStyles(1280);
    assert.equal(desktopStyles.overviewViewportBox.overflowY, 'hidden');
    assert.equal(desktopStyles.agentAdviceButton.minHeight >= 42, true);

    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      recurrenceRepository: recurrenceRepo,
      adviceRequestRepository: adviceRequestRepo,
      llmClient: FakeLlmClient.succeeding(SAMPLE_SUGGESTIONS),
      today: () => '2026-11-24',
      viewportWidth: 390,
    });

    const initial = await controller.initialize();
    assert.equal(initial.isAdviceModalOpen, false);

    const overviewHtml = renderToStaticMarkup(controller.renderElement());
    const chartIdx = overviewHtml.indexOf('data-testid="category-income-breakdown"');
    const buttonIdx = overviewHtml.indexOf('data-testid="open-agent-advice-modal-button"');
    assert.equal(chartIdx > -1 && buttonIdx > chartIdx, true);
    assert.match(overviewHtml, /data-testid="open-agent-advice-modal-button"[^>]*>Consejos Agente</);
    assert.doesNotMatch(overviewHtml, /data-testid="agent-advice-modal"/);

    const openedState = controller.openAdviceModal();
    assert.equal(openedState.isAdviceModalOpen, true);
    const modalHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(modalHtml, /data-testid="agent-advice-modal"/);
    assert.match(modalHtml, /data-testid="close-agent-advice-modal-button"/);
    assert.match(modalHtml, /data-testid="recommendations-panel"/);

    const closedState = controller.closeAdviceModal();
    assert.equal(closedState.isAdviceModalOpen, false);
    assert.doesNotMatch(
      renderToStaticMarkup(controller.renderElement()),
      /data-testid="agent-advice-modal"/,
    );

    controller.setActiveTab('reminders');
    const remindersHtml = renderToStaticMarkup(controller.renderElement());
    assert.doesNotMatch(remindersHtml, /data-testid="recommendations-panel"/);
  });

  it('[H16-R3][H16-R4][H16-R5][H16-R6] al abrir el modal sin consulta previa muestra el botón para pedir consejos y, si ya se pidió ese día, muestra directamente el último consejo solicitado hasta que cambie el día', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 25000000,
        date: '2026-11-10',
        categoryId: 1,
        createdAt: '2026-11-10T10:00:00',
      }),
    );

    const fake = FakeLlmClient.succeeding(SAMPLE_SUGGESTIONS);
    const controller = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      recurrenceRepository: recurrenceRepo,
      adviceRequestRepository: adviceRequestRepo,
      llmClient: fake,
      today: () => '2026-11-24',
      now: () => new Date(2026, 10, 24, 10, 0, 0),
      viewportWidth: 390,
    });

    await controller.initialize();
    controller.openAdviceModal();
    assert.equal(fake.calls.length, 0);
    assert.equal(controller.getState().advice.status, 'idle');

    const idleModalHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(idleModalHtml, /data-testid="recommendations-request-button"/);
    assert.doesNotMatch(idleModalHtml, /data-testid="agent-advice-last-requested-badge"/);

    await controller.requestAdvice();
    assert.equal(fake.calls.length, 1);
    assert.equal(controller.getState().advice.status, 'ready');

    controller.closeAdviceModal();
    controller.openAdviceModal();
    const reopenedHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(reopenedHtml, /data-testid="agent-advice-last-requested-badge"/);
    assert.match(reopenedHtml, /Últimos consejos solicitados hoy/);
    assert.match(reopenedHtml, /Controlá compras semanales/);

    const sameDayNewController = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      recurrenceRepository: recurrenceRepo,
      adviceRequestRepository: new SqliteAdviceRequestRepository(db),
      llmClient: fake,
      today: () => '2026-11-24',
      now: () => new Date(2026, 10, 24, 15, 0, 0),
      viewportWidth: 390,
    });
    const restoredState = await sameDayNewController.initialize();
    assert.equal(fake.calls.length, 1);
    assert.equal(restoredState.advice.status, 'ready');
    assert.equal(restoredState.advice.suggestions[0].titulo, 'Controlá compras semanales');

    sameDayNewController.openAdviceModal();
    const restoredModalHtml = renderToStaticMarkup(sameDayNewController.renderElement());
    assert.match(restoredModalHtml, /data-testid="agent-advice-last-requested-badge"/);
    assert.match(restoredModalHtml, /Controlá compras semanales/);

    const nextDayController = MonthlyOverviewScreen.createController({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      incomeRepository: incomeRepo,
      recurrenceRepository: recurrenceRepo,
      adviceRequestRepository: new SqliteAdviceRequestRepository(db),
      llmClient: fake,
      today: () => '2026-11-25',
      now: () => new Date(2026, 10, 25, 9, 0, 0),
      viewportWidth: 390,
    });
    const nextDayState = await nextDayController.initialize();
    assert.equal(nextDayState.advice.status, 'idle');
    assert.equal(nextDayState.advice.suggestions.length, 0);
  });
});

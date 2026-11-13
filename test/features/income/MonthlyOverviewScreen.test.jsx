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

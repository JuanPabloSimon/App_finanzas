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
});

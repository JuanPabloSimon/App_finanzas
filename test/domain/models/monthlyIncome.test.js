import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InvalidAmount,
  InvalidExpenseDate,
  InvalidInvestment,
  InvalidReminder,
  InvalidCredentials,
} from '../../../src/core/errors.js';
import { CORPORATE_THEME } from '../../../src/core/theme.js';
import { Category } from '../../../src/domain/models/category.js';
import { Expense } from '../../../src/domain/models/expense.js';
import {
  MonthlyIncome,
  calculateCategoryIncomeBreakdown,
} from '../../../src/domain/models/monthlyIncome.js';
import { Investment } from '../../../src/domain/models/investment.js';
import { Reminder } from '../../../src/domain/models/reminder.js';
import { UserAccount } from '../../../src/domain/models/userAccount.js';
import { MonthlyIncomeRepository } from '../../../src/domain/repositories/monthlyIncomeRepository.js';

describe('H5 modelos de dominio MonthlyIncome, Investment, Reminder, UserAccount y cálculo de porcentajes sobre el ingreso', () => {
  it('[H5-R1] crea una instancia inmutable de MonthlyIncome con período YYYY-MM y monto en centavos enteros > 0', async () => {
    const income = new MonthlyIncome({
      yearMonth: '2026-11',
      amountCents: 120000000,
      updatedAt: '2026-11-10T10:00:00',
    });

    assert.equal(income.yearMonth, '2026-11');
    assert.equal(income.amountCents, 120000000);
    assert.equal(income.updatedAt, '2026-11-10T10:00:00');
    assert.equal(Object.isFrozen(income), true);
    assert.equal(income.isEqual(income.copyWith({})), true);
    assert.equal(income.isEqual(income.copyWith({ amountCents: 150000000 })), false);

    const repo = new MonthlyIncomeRepository();
    await assert.rejects(() => repo.save(income), /Not implemented/);
    await assert.rejects(() => repo.findByYearMonth('2026-11'), /Not implemented/);
  });

  it('[H5-R2] calcula el porcentaje que cada categoría representa sobre el ingreso mensual registrado', () => {
    const categories = [
      new Category({ id: 1, name: 'Alimentos', isPredefined: true }),
      new Category({ id: 2, name: 'Transporte', isPredefined: true }),
    ];
    const expenses = [
      new Expense({
        id: 1,
        amountCents: 25000000,
        date: '2026-11-02',
        categoryId: 1,
        categoryName: 'Alimentos',
      }),
      new Expense({
        id: 2,
        amountCents: 5000000,
        date: '2026-11-04',
        categoryId: 1,
        categoryName: 'Alimentos',
      }),
      new Expense({
        id: 3,
        amountCents: 10000000,
        date: '2026-11-05',
        categoryId: 2,
        categoryName: 'Transporte',
      }),
    ];
    const income = new MonthlyIncome({
      yearMonth: '2026-11',
      amountCents: 100000000,
    });

    const breakdown = calculateCategoryIncomeBreakdown(expenses, categories, income);
    assert.equal(breakdown.length, 2);
    assert.equal(breakdown[0].categoryName, 'Alimentos');
    assert.equal(breakdown[0].amountCents, 30000000);
    assert.equal(breakdown[0].incomePercentage, 30);
    assert.equal(breakdown[1].categoryName, 'Transporte');
    assert.equal(breakdown[1].amountCents, 10000000);
    assert.equal(breakdown[1].incomePercentage, 10);
  });

  it('[H5-R3] omite los porcentajes sobre el ingreso (devuelve null en incomePercentage) cuando no hay ingreso cargado', () => {
    const categories = [
      new Category({ id: 1, name: 'Alimentos', isPredefined: true }),
    ];
    const expenses = [
      new Expense({
        id: 1,
        amountCents: 150000,
        date: '2026-11-06',
        categoryId: 1,
        categoryName: 'Alimentos',
      }),
    ];

    const breakdownWithoutIncome = calculateCategoryIncomeBreakdown(
      expenses,
      categories,
      null,
    );
    assert.equal(breakdownWithoutIncome.length, 1);
    assert.equal(breakdownWithoutIncome[0].amountCents, 150000);
    assert.equal(breakdownWithoutIncome[0].incomePercentage, null);
  });

  it('[H5-R4] rechaza ingresos, inversiones, recordatorios o cuentas con montos <= 0, períodos inválidos o campos vacíos', () => {
    for (const badAmount of [0, -100, 12.5, null, undefined, '1000']) {
      assert.throws(
        () => new MonthlyIncome({ yearMonth: '2026-11', amountCents: badAmount }),
        InvalidAmount,
      );
    }
    assert.throws(
      () => new MonthlyIncome({ yearMonth: '2026-13', amountCents: 100000 }),
      InvalidExpenseDate,
    );
    assert.throws(
      () =>
        new Investment({
          assetName: '',
          platform: 'Banco Nación',
          amountCents: 100000,
          date: '2026-11-01',
        }),
      InvalidInvestment,
    );
    assert.throws(
      () =>
        new Reminder({
          title: '   ',
          dueDate: '2026-11-20',
        }),
      InvalidReminder,
    );
    assert.throws(
      () => new UserAccount({ fullName: '', username: 'jp' }),
      InvalidCredentials,
    );
  });

  it('[H5-R5] crea instancias inmutables de Investment (control de gestión de capital), Reminder, UserAccount y define la paleta corporativa', () => {
    const investment = new Investment({
      id: 1,
      assetName: '  Plazo Fijo Tradicional ',
      platform: '  Banco Nación ',
      amountCents: 50000000,
      date: '2026-11-01',
      dueDate: '2026-11-30',
      note: 'TNA 36%',
      createdAt: '2026-11-01T10:00:00',
    });

    assert.equal(investment.assetName, 'Plazo Fijo Tradicional');
    assert.equal(investment.platform, 'Banco Nación');
    assert.equal(investment.amountCents, 50000000);
    assert.equal(investment.dueDate, '2026-11-30');
    assert.equal(Object.isFrozen(investment), true);

    const reminder = new Reminder({
      id: 2,
      title: '  Vencimiento Plazo Fijo Banco Nación ',
      dueDate: '2026-11-30',
      amountCents: 50000000,
      isCompleted: false,
      createdAt: '2026-11-01T10:00:00',
    });
    assert.equal(reminder.title, 'Vencimiento Plazo Fijo Banco Nación');
    assert.equal(reminder.dueDate, '2026-11-30');
    assert.equal(Object.isFrozen(reminder), true);

    const user = new UserAccount({
      id: 1,
      fullName: 'Juan Pablo',
      username: 'juanpablo',
    });
    assert.equal(user.fullName, 'Juan Pablo');
    assert.equal(user.username, 'juanpablo');

    assert.equal(CORPORATE_THEME.navyPrimary, '#0F2942');
    assert.equal(CORPORATE_THEME.brownPrimary, '#4A3525');
  });
});

import React, { useState, useEffect } from 'react';
import { AppShell } from './app/AppShell.jsx';
import { Consent, CURRENT_POLICY_VERSION } from './domain/models/consent.js';
import { Category } from './domain/models/category.js';
import { Expense } from './domain/models/expense.js';
import { MonthlyIncome } from './domain/models/monthlyIncome.js';
import { Investment } from './domain/models/investment.js';
import { Reminder } from './domain/models/reminder.js';
import { UserAccount } from './domain/models/userAccount.js';
import { InvalidCategory, ExpenseNotFound, InvalidCredentials } from './core/errors.js';
import { formatIsoDate, formatIsoDateTime, extractYearMonth } from './core/dates.js';
import { PREDEFINED_CATEGORIES } from './data/db/appDatabase.js';

const h = React.createElement;

function readStorage(key, fallback) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignorar cuota excedida en modo privado
  }
}

function createBrowserRepositories() {
  const defaultCats = PREDEFINED_CATEGORIES.map(
    (name, idx) =>
      new Category({
        id: idx + 1,
        name,
        isPredefined: true,
        createdAt: '2026-10-01T00:00:00',
      }),
  );

  const consentRepo = {
    async findByVersion(policyVersion) {
      const map = readStorage('fp_consents', {});
      const item = map[policyVersion];
      return item ? new Consent(item) : null;
    },
    async hasAcceptedVersion(policyVersion = CURRENT_POLICY_VERSION) {
      const map = readStorage('fp_consents', {});
      return Boolean(map[policyVersion]);
    },
    async save(consent) {
      const record = consent instanceof Consent ? consent : new Consent(consent);
      const map = readStorage('fp_consents', {});
      map[record.policyVersion] = {
        policyVersion: record.policyVersion,
        acceptedAt: record.acceptedAt,
      };
      writeStorage('fp_consents', map);
      return record;
    },
  };

  const categoryRepo = {
    async findAll() {
      const expenses = readStorage('fp_expenses', []);
      const countByCat = new Map();
      for (const exp of expenses) {
        countByCat.set(exp.categoryId, (countByCat.get(exp.categoryId) ?? 0) + 1);
      }
      return [...defaultCats].sort((a, b) => {
        const diff = (countByCat.get(b.id) ?? 0) - (countByCat.get(a.id) ?? 0);
        return diff !== 0 ? diff : a.id - b.id;
      });
    },
    async findById(id) {
      return defaultCats.find((c) => c.id === Number(id)) ?? null;
    },
  };

  const expenseRepo = {
    async save(expense) {
      const record = expense instanceof Expense ? expense : new Expense(expense);
      const cat = await categoryRepo.findById(record.categoryId);
      if (!cat) throw new InvalidCategory();
      const list = readStorage('fp_expenses', []);
      const nextId = list.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;
      const nowIso = formatIsoDateTime(new Date());
      const saved = new Expense({
        id: nextId,
        amountCents: record.amountCents,
        date: record.date,
        categoryId: record.categoryId,
        categoryName: cat.name,
        subcategory: record.subcategory,
        note: record.note,
        createdAt: record.createdAt ?? nowIso,
        updatedAt: record.updatedAt ?? record.createdAt ?? nowIso,
      });
      list.push(saved);
      writeStorage('fp_expenses', list);
      return saved;
    },
    async findById(id) {
      const list = readStorage('fp_expenses', []);
      const found = list.find((e) => e.id === Number(id));
      return found ? new Expense(found) : null;
    },
    async findByYearMonth(yearMonth) {
      const list = readStorage('fp_expenses', []);
      return list
        .filter((e) => e.date.slice(0, 7) === yearMonth)
        .sort((a, b) =>
          a.date !== b.date ? b.date.localeCompare(a.date) : (b.id ?? 0) - (a.id ?? 0),
        )
        .map((e) => new Expense(e));
    },
    async update(expense) {
      const record = expense instanceof Expense ? expense : new Expense(expense);
      const list = readStorage('fp_expenses', []);
      const idx = list.findIndex((e) => e.id === record.id);
      if (idx === -1) throw new ExpenseNotFound(record.id);
      const cat = await categoryRepo.findById(record.categoryId);
      if (!cat) throw new InvalidCategory();
      const updated = new Expense({
        id: record.id,
        amountCents: record.amountCents,
        date: record.date,
        categoryId: record.categoryId,
        categoryName: cat.name,
        subcategory: record.subcategory,
        note: record.note,
        createdAt: list[idx].createdAt,
        updatedAt: record.updatedAt ?? formatIsoDateTime(new Date()),
      });
      list[idx] = updated;
      writeStorage('fp_expenses', list);
      return updated;
    },
    async deleteById(id) {
      const list = readStorage('fp_expenses', []);
      const idx = list.findIndex((e) => e.id === Number(id));
      if (idx === -1) throw new ExpenseNotFound(id);
      list.splice(idx, 1);
      writeStorage('fp_expenses', list);
      return true;
    },
  };

  const incomeRepo = {
    async save(income) {
      const record =
        income instanceof MonthlyIncome ? income : new MonthlyIncome(income);
      const map = readStorage('fp_incomes', {});
      map[record.yearMonth] = {
        yearMonth: record.yearMonth,
        amountCents: record.amountCents,
        updatedAt: record.updatedAt ?? formatIsoDateTime(new Date()),
      };
      writeStorage('fp_incomes', map);
      return new MonthlyIncome(map[record.yearMonth]);
    },
    async findByYearMonth(yearMonth) {
      const map = readStorage('fp_incomes', {});
      return map[yearMonth] ? new MonthlyIncome(map[yearMonth]) : null;
    },
  };

  const investmentRepo = {
    async save(investment) {
      const record =
        investment instanceof Investment ? investment : new Investment(investment);
      const list = readStorage('fp_investments', []);
      const nextId = list.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;
      const saved = new Investment({
        id: nextId,
        assetName: record.assetName,
        platform: record.platform,
        amountCents: record.amountCents,
        date: record.date,
        dueDate: record.dueDate,
        note: record.note,
        createdAt: record.createdAt ?? formatIsoDateTime(new Date()),
      });
      list.push(saved);
      writeStorage('fp_investments', list);
      return saved;
    },
    async findByYearMonth(yearMonth) {
      const list = readStorage('fp_investments', []);
      return list
        .filter((i) => i.date.slice(0, 7) === yearMonth)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((i) => new Investment(i));
    },
  };

  const reminderRepo = {
    async save(reminder) {
      const record =
        reminder instanceof Reminder ? reminder : new Reminder(reminder);
      const list = readStorage('fp_reminders', []);
      const nextId = list.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;
      const saved = new Reminder({
        id: nextId,
        title: record.title,
        dueDate: record.dueDate,
        amountCents: record.amountCents,
        isCompleted: record.isCompleted,
        createdAt: record.createdAt ?? formatIsoDateTime(new Date()),
      });
      list.push(saved);
      writeStorage('fp_reminders', list);
      return saved;
    },
    async findAll() {
      const list = readStorage('fp_reminders', []);
      return list
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .map((r) => new Reminder(r));
    },
  };

  const userAccountRepo = {
    async register({ fullName, username, password }) {
      const cleanPass = typeof password === 'string' ? password.trim() : '';
      if (cleanPass.length < 4) {
        throw new InvalidCredentials('La clave debe tener al menos 4 caracteres');
      }
      const draft = new UserAccount({ fullName, username });
      const accounts = readStorage('fp_accounts', []);
      if (accounts.some((a) => a.username === draft.username)) {
        throw new InvalidCredentials('Ya existe una cuenta con ese usuario');
      }
      const nextId = accounts.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;
      const user = new UserAccount({
        id: nextId,
        fullName: draft.fullName,
        username: draft.username,
        createdAt: formatIsoDateTime(new Date()),
      });
      accounts.push({ ...user, passwordHash: `local:${cleanPass}` });
      writeStorage('fp_accounts', accounts);
      return user;
    },
    async authenticate({ username, password }) {
      const cleanUser =
        typeof username === 'string' ? username.trim().toLowerCase() : '';
      const cleanPass = typeof password === 'string' ? password.trim() : '';
      const accounts = readStorage('fp_accounts', []);
      const found = accounts.find(
        (a) => a.username === cleanUser && a.passwordHash === `local:${cleanPass}`,
      );
      if (!found) {
        throw new InvalidCredentials('Usuario o clave incorrectos');
      }
      return new UserAccount(found);
    },
  };

  const seedDemoDataIfEmpty = async () => {
    const todayStr = formatIsoDate(new Date());
    const ym = extractYearMonth(todayStr);
    const existingIncome = await incomeRepo.findByYearMonth(ym);
    if (!existingIncome) {
      await incomeRepo.save({
        yearMonth: ym,
        amountCents: 185000000,
        updatedAt: formatIsoDateTime(new Date()),
      });
    }
    const existingExpenses = await expenseRepo.findByYearMonth(ym);
    if (existingExpenses.length === 0) {
      await expenseRepo.save({
        amountCents: 32000000,
        date: `${ym}-03`,
        categoryId: 1,
        subcategory: 'Supermercado Mayorista',
        note: 'Compra mensual familiar',
      });
      await expenseRepo.save({
        amountCents: 14500000,
        date: `${ym}-05`,
        categoryId: 3,
        subcategory: 'Luz, Gas e Internet',
        note: 'Servicios del hogar',
      });
      await expenseRepo.save({
        amountCents: 6800000,
        date: `${ym}-08`,
        categoryId: 2,
        subcategory: 'Combustible y SUBE',
        note: 'Traslados laborales',
      });
    }
    const existingInvestments = await investmentRepo.findByYearMonth(ym);
    if (existingInvestments.length === 0) {
      await investmentRepo.save({
        assetName: 'Plazo Fijo Tradicional 30 días',
        platform: 'Banco Nación',
        amountCents: 60000000,
        date: `${ym}-01`,
        dueDate: `${ym}-28`,
        note: 'TNA 37% — Capital reservado',
      });
      await investmentRepo.save({
        assetName: 'FCI Money Market',
        platform: 'Balanz',
        amountCents: 25000000,
        date: `${ym}-04`,
        dueDate: null,
        note: 'Fondo de liquidez inmediata',
      });
    }
    const existingReminders = await reminderRepo.findAll();
    if (existingReminders.length === 0) {
      await reminderRepo.save({
        title: 'Renovar o retirar Plazo Fijo Banco Nación',
        dueDate: `${ym}-28`,
        amountCents: 60000000,
      });
      await reminderRepo.save({
        title: 'Cierre de tarjeta y control de servicios',
        dueDate: `${ym}-22`,
      });
    }
    return new UserAccount({
      id: 1,
      fullName: 'Juan Pablo (Cuenta Demo)',
      username: 'juanpablo',
      createdAt: formatIsoDateTime(new Date()),
    });
  };

  return {
    consentRepo,
    categoryRepo,
    expenseRepo,
    incomeRepo,
    investmentRepo,
    reminderRepo,
    userAccountRepo,
    seedDemoDataIfEmpty,
  };
}

function getWindowWidth() {
  if (typeof window !== 'undefined' && Number.isFinite(window.innerWidth)) {
    return window.innerWidth;
  }
  return 390;
}

export function App(props) {
  const [viewportWidth, setViewportWidth] = useState(getWindowWidth);
  const [repos] = useState(createBrowserRepositories);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleResize = () => setViewportWidth(getWindowWidth());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return h(AppShell, {
    consentRepository: repos.consentRepo,
    userAccountRepository: repos.userAccountRepo,
    expenseRepository: repos.expenseRepo,
    categoryRepository: repos.categoryRepo,
    incomeRepository: repos.incomeRepo,
    investmentRepository: repos.investmentRepo,
    reminderRepository: repos.reminderRepo,
    requireAuth: true,
    onDemoSeed: repos.seedDemoDataIfEmpty,
    viewportWidth,
    ...props,
  });
}

export default App;

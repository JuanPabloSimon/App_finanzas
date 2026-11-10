import React, { useState, useEffect } from 'react';
import { Category } from '../../domain/models/category.js';
import { Expense } from '../../domain/models/expense.js';
import {
  DomainException,
  InvalidAmount,
  InvalidExpenseDate,
  InvalidCategory,
  ExpenseNotFound,
} from '../../core/errors.js';
import {
  formatIsoDate,
  formatIsoDateTime,
  extractYearMonth,
} from '../../core/dates.js';
import {
  parseAmountToCents,
  formatCentsToArs,
  formatCentsToInput,
} from '../../core/formatters.js';
import { getViewportLayout } from '../../core/responsive.js';
import { PREDEFINED_CATEGORIES } from '../../data/db/appDatabase.js';

const h = React.createElement;

function buildDefaultCategories(createdAt = '2026-10-01T00:00:00') {
  return PREDEFINED_CATEGORIES.map(
    (name, idx) =>
      new Category({
        id: idx + 1,
        name,
        isPredefined: true,
        createdAt,
      }),
  );
}

function createInMemoryCategoryRepository(seedCategories = buildDefaultCategories()) {
  const categories = [...seedCategories];
  return {
    async findAll() {
      return [...categories];
    },
    async findById(id) {
      return categories.find((cat) => cat.id === id) ?? null;
    },
  };
}

function createInMemoryExpenseRepository(categoryRepository) {
  const expenses = [];
  let nextId = 1;
  return {
    async save(expense) {
      const record = expense instanceof Expense ? expense : new Expense(expense);
      const category = categoryRepository
        ? await categoryRepository.findById(record.categoryId)
        : null;
      if (!category) {
        throw new InvalidCategory('Seleccioná una categoría válida');
      }
      const nowIso = formatIsoDateTime(new Date());
      const createdAt = record.createdAt ?? nowIso;
      const updatedAt = record.updatedAt ?? createdAt;
      const saved = new Expense({
        id: nextId++,
        amountCents: record.amountCents,
        date: record.date,
        categoryId: record.categoryId,
        categoryName: category.name,
        subcategory: record.subcategory,
        note: record.note,
        createdAt,
        updatedAt,
      });
      expenses.push(saved);
      return saved;
    },
    async findById(id) {
      if (!Number.isInteger(id) || id <= 0) {
        return null;
      }
      return expenses.find((item) => item.id === id) ?? null;
    },
    async findByYearMonth(yearMonth) {
      return expenses
        .filter((item) => item.date.slice(0, 7) === yearMonth)
        .sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }
          return (b.id ?? 0) - (a.id ?? 0);
        });
    },
    async update(expense) {
      if (!expense || !Number.isInteger(expense.id) || expense.id <= 0) {
        throw new ExpenseNotFound(expense?.id ?? null);
      }
      const record = expense instanceof Expense ? expense : new Expense(expense);
      const idx = expenses.findIndex((item) => item.id === record.id);
      if (idx === -1) {
        throw new ExpenseNotFound(record.id);
      }
      const category = categoryRepository
        ? await categoryRepository.findById(record.categoryId)
        : null;
      if (!category) {
        throw new InvalidCategory('Seleccioná una categoría válida');
      }
      const existing = expenses[idx];
      const nowIso = formatIsoDateTime(new Date());
      const updatedAt =
        record.updatedAt && record.updatedAt !== existing.updatedAt
          ? record.updatedAt
          : nowIso;
      const updated = new Expense({
        id: existing.id,
        amountCents: record.amountCents,
        date: record.date,
        categoryId: record.categoryId,
        categoryName: category.name,
        subcategory: record.subcategory,
        note: record.note,
        createdAt: existing.createdAt,
        updatedAt,
      });
      expenses[idx] = updated;
      return updated;
    },
    async deleteById(id) {
      if (!Number.isInteger(id) || id <= 0) {
        throw new ExpenseNotFound(id);
      }
      const idx = expenses.findIndex((item) => item.id === id);
      if (idx === -1) {
        throw new ExpenseNotFound(id);
      }
      expenses.splice(idx, 1);
      return true;
    },
  };
}

function calculateMonthlyTotalCents(expenses = []) {
  return expenses.reduce((sum, item) => sum + (item?.amountCents ?? 0), 0);
}

function buildExpenseFormStyles(viewportWidth = 390) {
  const layout = getViewportLayout(viewportWidth);
  const gridColumns = layout.columns;

  return Object.freeze({
    layout,
    gridColumns,
    wrapper: Object.freeze({
      width: '100%',
      boxSizing: 'border-box',
      padding: layout.isMobile ? 16 : 24,
      maxWidth: layout.isMobile ? '100%' : layout.containerMaxWidth,
      margin: '0 auto',
      color: '#0f172a',
    }),
    grid: Object.freeze({
      display: 'grid',
      gridTemplateColumns:
        gridColumns === 1 ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)',
      gap: layout.isMobile ? 16 : 24,
      alignItems: 'start',
    }),
    card: Object.freeze({
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: layout.isMobile ? 12 : 16,
      padding: layout.isMobile ? 16 : 24,
      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
    }),
    fieldGroup: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      marginBottom: 14,
    }),
    label: Object.freeze({
      fontSize: 14,
      fontWeight: 600,
      color: '#334155',
    }),
    amountInput: Object.freeze({
      minHeight: 48,
      padding: '10px 14px',
      fontSize: 20,
      fontWeight: 600,
      borderRadius: 10,
      border: '1px solid #cbd5e1',
      boxSizing: 'border-box',
      width: '100%',
    }),
    input: Object.freeze({
      minHeight: 44,
      padding: '10px 12px',
      fontSize: 15,
      borderRadius: 10,
      border: '1px solid #cbd5e1',
      boxSizing: 'border-box',
      width: '100%',
      backgroundColor: '#ffffff',
    }),
    errorMessage: Object.freeze({
      margin: '4px 0 0 0',
      color: '#dc2626',
      fontSize: 13,
      fontWeight: 600,
    }),
    submitButton: Object.freeze({
      minHeight: 48,
      width: '100%',
      padding: '12px 20px',
      borderRadius: 10,
      border: 'none',
      backgroundColor: '#0284c7',
      color: '#ffffff',
      fontWeight: 600,
      fontSize: 16,
      cursor: 'pointer',
      marginTop: 4,
    }),
    cancelEditButton: Object.freeze({
      minHeight: 48,
      width: '100%',
      padding: '10px 18px',
      borderRadius: 10,
      border: '1px solid #cbd5e1',
      backgroundColor: '#f8fafc',
      color: '#334155',
      fontWeight: 600,
      fontSize: 15,
      cursor: 'pointer',
      marginTop: 8,
    }),
    monthSummaryBox: Object.freeze({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 14px',
      marginBottom: 14,
      borderRadius: 10,
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
    }),
    expenseItem: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '12px 0',
      borderBottom: '1px solid #f1f5f9',
    }),
    expenseItemMain: Object.freeze({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    }),
    actionRow: Object.freeze({
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    }),
    actionButton: Object.freeze({
      minHeight: 44,
      padding: '8px 14px',
      borderRadius: 8,
      border: '1px solid #cbd5e1',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
    }),
    deleteActionButton: Object.freeze({
      minHeight: 44,
      padding: '8px 14px',
      borderRadius: 8,
      border: '1px solid #fecaca',
      backgroundColor: '#fef2f2',
      color: '#b91c1c',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
    }),
    confirmBox: Object.freeze({
      display: 'flex',
      flexDirection: layout.isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: layout.isMobile ? 'stretch' : 'center',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      backgroundColor: '#fff1f2',
      border: '1px solid #fecdd3',
    }),
    confirmDeleteButton: Object.freeze({
      minHeight: 44,
      padding: '8px 14px',
      borderRadius: 8,
      border: 'none',
      backgroundColor: '#dc2626',
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
    }),
  });
}

class ExpenseFormController {
  constructor({
    expenseRepository,
    categoryRepository,
    today = () => formatIsoDate(new Date()),
    now = () => new Date(),
    viewportWidth = 390,
  } = {}) {
    const fallbackCatRepo = categoryRepository ?? createInMemoryCategoryRepository();
    this.categoryRepository = fallbackCatRepo;
    this.expenseRepository =
      expenseRepository ?? createInMemoryExpenseRepository(fallbackCatRepo);
    this.today = today;
    this.now = now;
    this.viewportWidth = viewportWidth;

    const initialDate = formatIsoDate(this.today());
    this.categories = [];
    this.expenses = [];
    this.activeYearMonth = extractYearMonth(initialDate);
    this.editingExpenseId = null;
    this.confirmingDeleteId = null;
    this.amountInput = '';
    this.dateInput = initialDate;
    this.categoryId = null;
    this.subcategoryInput = '';
    this.noteInput = '';
    this.amountError = null;
    this.formError = null;
    this.initialized = false;
  }

  async initialize() {
    const loadedCategories = await this.categoryRepository.findAll();
    this.categories = loadedCategories;
    if (this.categoryId === null && loadedCategories.length > 0) {
      this.categoryId = loadedCategories[0].id;
    }
    const defaultDate = formatIsoDate(this.today());
    this.dateInput = defaultDate;
    this.activeYearMonth = extractYearMonth(defaultDate);
    this.expenses = await this.expenseRepository.findByYearMonth(this.activeYearMonth);
    this.initialized = true;
    return this.getState();
  }

  setAmountInput(value) {
    this.amountInput = value === null || value === undefined ? '' : String(value);
    if (this.amountError) {
      this.amountError = null;
    }
    return this.getState();
  }

  setDateInput(value) {
    this.dateInput = value === null || value === undefined ? '' : String(value);
    if (this.formError) {
      this.formError = null;
    }
    return this.getState();
  }

  setCategoryId(value) {
    this.categoryId = Number(value);
    if (this.formError) {
      this.formError = null;
    }
    return this.getState();
  }

  setSubcategoryInput(value) {
    this.subcategoryInput = value === null || value === undefined ? '' : String(value);
    return this.getState();
  }

  setNoteInput(value) {
    this.noteInput = value === null || value === undefined ? '' : String(value);
    return this.getState();
  }

  setViewportWidth(width) {
    this.viewportWidth = width;
    return this.getState();
  }

  startEditExpense(expenseId) {
    const numericId = Number(expenseId);
    const target = this.expenses.find((item) => item.id === numericId);
    if (!target) {
      const notFoundError = new ExpenseNotFound(numericId);
      this.formError = notFoundError.message;
      return this.getState();
    }

    this.editingExpenseId = target.id;
    this.confirmingDeleteId = null;
    this.amountInput = formatCentsToInput(target.amountCents);
    this.dateInput = target.date;
    this.categoryId = target.categoryId;
    this.subcategoryInput = target.subcategory ?? '';
    this.noteInput = target.note ?? '';
    this.amountError = null;
    this.formError = null;
    return this.getState();
  }

  cancelEditExpense() {
    this.editingExpenseId = null;
    this.amountInput = '';
    this.dateInput = formatIsoDate(this.today());
    this.subcategoryInput = '';
    this.noteInput = '';
    this.amountError = null;
    this.formError = null;
    return this.getState();
  }

  requestDeleteExpense(expenseId) {
    const numericId = Number(expenseId);
    this.confirmingDeleteId = numericId;
    this.formError = null;
    return this.getState();
  }

  cancelDeleteExpense() {
    this.confirmingDeleteId = null;
    return this.getState();
  }

  async confirmDeleteExpense(expenseId) {
    const targetId =
      expenseId !== undefined && expenseId !== null
        ? Number(expenseId)
        : this.confirmingDeleteId;

    this.formError = null;
    try {
      await this.expenseRepository.deleteById(targetId);
      this.confirmingDeleteId = null;
      if (this.editingExpenseId === targetId) {
        this.cancelEditExpense();
      }
      this.expenses = await this.expenseRepository.findByYearMonth(this.activeYearMonth);
      this.categories = await this.categoryRepository.findAll();
      return this.getState();
    } catch (err) {
      this.confirmingDeleteId = null;
      if (err instanceof DomainException) {
        this.formError = err.message;
        return this.getState();
      }
      throw err;
    }
  }

  async submitExpense(overrides = {}) {
    const rawAmount =
      overrides.amountInput !== undefined ? overrides.amountInput : this.amountInput;
    const rawDate =
      overrides.date !== undefined ? overrides.date : this.dateInput;
    const rawCategoryId =
      overrides.categoryId !== undefined
        ? Number(overrides.categoryId)
        : Number(this.categoryId);
    const rawSubcategory =
      overrides.subcategory !== undefined
        ? overrides.subcategory
        : this.subcategoryInput;
    const rawNote =
      overrides.note !== undefined ? overrides.note : this.noteInput;
    const targetEditId =
      overrides.editingExpenseId !== undefined
        ? overrides.editingExpenseId
        : this.editingExpenseId;

    this.amountError = null;
    this.formError = null;

    let amountCents;
    try {
      amountCents = parseAmountToCents(rawAmount);
    } catch (err) {
      if (err instanceof InvalidAmount) {
        this.amountError = err.message;
        return this.getState();
      }
      throw err;
    }

    try {
      const timestamp = formatIsoDateTime(this.now());

      if (targetEditId !== null && targetEditId !== undefined) {
        const existingInList = this.expenses.find((item) => item.id === targetEditId);
        const draftToUpdate = new Expense({
          id: Number(targetEditId),
          amountCents,
          date: rawDate,
          categoryId: rawCategoryId,
          subcategory: rawSubcategory,
          note: rawNote,
          createdAt: existingInList?.createdAt ?? timestamp,
          updatedAt: timestamp,
        });

        await this.expenseRepository.update(draftToUpdate);
        this.expenses = await this.expenseRepository.findByYearMonth(
          this.activeYearMonth,
        );
        this.categories = await this.categoryRepository.findAll();
        this.editingExpenseId = null;
        this.amountInput = '';
        this.subcategoryInput = '';
        this.noteInput = '';
        this.dateInput = formatIsoDate(this.today());
        return this.getState();
      }

      const draft = new Expense({
        amountCents,
        date: rawDate,
        categoryId: rawCategoryId,
        subcategory: rawSubcategory,
        note: rawNote,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      const saved = await this.expenseRepository.save(draft);
      const targetYearMonth = extractYearMonth(saved.date);
      this.activeYearMonth = targetYearMonth;
      this.expenses = await this.expenseRepository.findByYearMonth(targetYearMonth);
      this.categories = await this.categoryRepository.findAll();

      this.amountInput = '';
      this.subcategoryInput = '';
      this.noteInput = '';
      this.dateInput = saved.date;
      return this.getState();
    } catch (err) {
      if (err instanceof InvalidAmount) {
        this.amountError = err.message;
        return this.getState();
      }
      if (err instanceof DomainException) {
        this.formError = err.message;
        return this.getState();
      }
      throw err;
    }
  }

  getState() {
    const monthlyTotalCents = calculateMonthlyTotalCents(this.expenses);
    return Object.freeze({
      initialized: this.initialized,
      categories: [...this.categories],
      expenses: [...this.expenses],
      monthlyTotalCents,
      activeYearMonth: this.activeYearMonth,
      editingExpenseId: this.editingExpenseId,
      confirmingDeleteId: this.confirmingDeleteId,
      amountInput: this.amountInput,
      dateInput: this.dateInput,
      categoryId: this.categoryId,
      subcategoryInput: this.subcategoryInput,
      noteInput: this.noteInput,
      amountError: this.amountError,
      formError: this.formError,
      viewportWidth: this.viewportWidth,
    });
  }

  renderElement() {
    const state = this.getState();
    return h(ExpenseFormScreen, {
      expenseRepository: this.expenseRepository,
      categoryRepository: this.categoryRepository,
      initialCategories: state.categories,
      initialExpenses: state.expenses,
      initialEditingExpenseId: state.editingExpenseId,
      initialConfirmingDeleteId: state.confirmingDeleteId,
      initialAmount: state.amountInput,
      initialDate: state.dateInput,
      initialCategoryId: state.categoryId,
      initialSubcategory: state.subcategoryInput,
      initialNote: state.noteInput,
      initialAmountError: state.amountError,
      initialFormError: state.formError,
      today: this.today,
      now: this.now,
      viewportWidth: state.viewportWidth,
    });
  }
}

export function ExpenseFormScreen({
  expenseRepository = null,
  categoryRepository = null,
  initialCategories = undefined,
  initialExpenses = undefined,
  initialEditingExpenseId = null,
  initialConfirmingDeleteId = null,
  initialAmount = '',
  initialDate = undefined,
  initialCategoryId = undefined,
  initialSubcategory = '',
  initialNote = '',
  initialAmountError = null,
  initialFormError = null,
  today = () => formatIsoDate(new Date()),
  now = () => new Date(),
  viewportWidth = 390,
  onExpenseSaved = undefined,
} = {}) {
  const defaultToday = formatIsoDate(today());
  const resolvedCategories =
    initialCategories !== undefined ? initialCategories : buildDefaultCategories();
  const defaultCategoryId =
    initialCategoryId !== undefined && initialCategoryId !== null
      ? Number(initialCategoryId)
      : resolvedCategories[0]?.id ?? 1;

  const [catRepo] = useState(
    () => categoryRepository ?? createInMemoryCategoryRepository(resolvedCategories),
  );
  const [expRepo] = useState(
    () => expenseRepository ?? createInMemoryExpenseRepository(catRepo),
  );

  const [categories, setCategories] = useState(resolvedCategories);
  const [expenses, setExpenses] = useState(initialExpenses ?? []);
  const [editingExpenseId, setEditingExpenseId] = useState(initialEditingExpenseId);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(
    initialConfirmingDeleteId,
  );
  const [amountInput, setAmountInput] = useState(initialAmount);
  const [dateInput, setDateInput] = useState(initialDate ?? defaultToday);
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [subcategoryInput, setSubcategoryInput] = useState(initialSubcategory);
  const [noteInput, setNoteInput] = useState(initialNote);
  const [amountError, setAmountError] = useState(initialAmountError);
  const [formError, setFormError] = useState(initialFormError);

  const activeYearMonth = extractYearMonth(defaultToday);

  useEffect(() => {
    let active = true;
    if (initialCategories !== undefined && initialExpenses !== undefined) {
      return undefined;
    }
    Promise.all([
      catRepo.findAll(),
      expRepo.findByYearMonth(extractYearMonth(dateInput)),
    ]).then(([loadedCats, loadedExpenses]) => {
      if (!active) {
        return;
      }
      setCategories(loadedCats);
      if (loadedCats.length > 0 && !loadedCats.some((c) => c.id === categoryId)) {
        setCategoryId(loadedCats[0].id);
      }
      setExpenses(loadedExpenses);
    });
    return () => {
      active = false;
    };
  }, [catRepo, expRepo, dateInput, categoryId, initialCategories, initialExpenses]);

  const styles = buildExpenseFormStyles(viewportWidth);
  const { layout, gridColumns } = styles;
  const layoutMode = layout.isDesktop
    ? 'desktop'
    : layout.isTablet
      ? 'tablet'
      : 'mobile';

  const monthlyTotalCents = calculateMonthlyTotalCents(expenses);
  const isEditing = editingExpenseId !== null && editingExpenseId !== undefined;

  const handleStartEdit = (item) => {
    setEditingExpenseId(item.id);
    setConfirmingDeleteId(null);
    setAmountInput(formatCentsToInput(item.amountCents));
    setDateInput(item.date);
    setCategoryId(item.categoryId);
    setSubcategoryInput(item.subcategory ?? '');
    setNoteInput(item.note ?? '');
    setAmountError(null);
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setAmountInput('');
    setDateInput(defaultToday);
    setSubcategoryInput('');
    setNoteInput('');
    setAmountError(null);
    setFormError(null);
  };

  const handleRequestDelete = (itemId) => {
    setConfirmingDeleteId(itemId);
    setFormError(null);
  };

  const handleCancelDelete = () => {
    setConfirmingDeleteId(null);
  };

  const handleConfirmDelete = async (itemId) => {
    setFormError(null);
    try {
      await expRepo.deleteById(itemId);
      setConfirmingDeleteId(null);
      if (editingExpenseId === itemId) {
        handleCancelEdit();
      }
      const updatedList = await expRepo.findByYearMonth(activeYearMonth);
      const updatedCategories = await catRepo.findAll();
      setExpenses(updatedList);
      setCategories(updatedCategories);
    } catch (err) {
      setConfirmingDeleteId(null);
      if (err instanceof DomainException) {
        setFormError(err.message);
        return;
      }
      throw err;
    }
  };

  const handleConfirm = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    setAmountError(null);
    setFormError(null);

    let amountCents;
    try {
      amountCents = parseAmountToCents(amountInput);
    } catch (err) {
      if (err instanceof InvalidAmount) {
        setAmountError(err.message);
        return null;
      }
      throw err;
    }

    try {
      const timestamp = formatIsoDateTime(now());
      if (isEditing) {
        const existingItem = expenses.find((item) => item.id === editingExpenseId);
        const draftToUpdate = new Expense({
          id: Number(editingExpenseId),
          amountCents,
          date: dateInput,
          categoryId: Number(categoryId),
          subcategory: subcategoryInput,
          note: noteInput,
          createdAt: existingItem?.createdAt ?? timestamp,
          updatedAt: timestamp,
        });
        const updated = await expRepo.update(draftToUpdate);
        const updatedList = await expRepo.findByYearMonth(activeYearMonth);
        const updatedCategories = await catRepo.findAll();
        setExpenses(updatedList);
        setCategories(updatedCategories);
        setEditingExpenseId(null);
        setAmountInput('');
        setSubcategoryInput('');
        setNoteInput('');
        setDateInput(defaultToday);
        if (typeof onExpenseSaved === 'function') {
          onExpenseSaved(updated);
        }
        return updated;
      }

      const draft = new Expense({
        amountCents,
        date: dateInput,
        categoryId: Number(categoryId),
        subcategory: subcategoryInput,
        note: noteInput,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const saved = await expRepo.save(draft);
      const updatedList = await expRepo.findByYearMonth(extractYearMonth(saved.date));
      const updatedCategories = await catRepo.findAll();
      setExpenses(updatedList);
      setCategories(updatedCategories);
      setAmountInput('');
      setSubcategoryInput('');
      setNoteInput('');
      if (typeof onExpenseSaved === 'function') {
        onExpenseSaved(saved);
      }
      return saved;
    } catch (err) {
      if (err instanceof InvalidAmount) {
        setAmountError(err.message);
        return null;
      }
      if (
        err instanceof InvalidExpenseDate ||
        err instanceof InvalidCategory ||
        err instanceof DomainException
      ) {
        setFormError(err.message);
        return null;
      }
      throw err;
    }
  };

  const handleFormKeyDown = (event) => {
    if (event && event.key === 'Enter') {
      return handleConfirm(event);
    }
    return undefined;
  };

  return h(
    'section',
    {
      'data-testid': 'expense-form-screen',
      'data-layout': layoutMode,
      'data-columns': String(gridColumns),
      style: styles.wrapper,
    },
    h(
      'div',
      {
        'data-testid': 'expense-workspace-grid',
        style: styles.grid,
      },
      h(
        'form',
        {
          'data-testid': 'expense-form',
          'data-mode': isEditing ? 'edit' : 'create',
          style: styles.card,
          onSubmit: handleConfirm,
          onKeyDown: handleFormKeyDown,
          noValidate: true,
        },
        h(
          'h2',
          {
            'data-testid': 'expense-form-title',
            style: { marginTop: 0, marginBottom: 16, fontSize: layout.isMobile ? 19 : 22 },
          },
          isEditing ? 'Editar gasto' : 'Registrar un gasto',
        ),
        h(
          'div',
          { style: styles.fieldGroup },
          h(
            'label',
            { htmlFor: 'expense-amount-input', style: styles.label },
            'Monto ($)',
          ),
          h('input', {
            id: 'expense-amount-input',
            'data-testid': 'expense-amount-input',
            type: 'text',
            inputMode: 'decimal',
            placeholder: 'Ej: 1500,50',
            value: amountInput,
            tabIndex: 0,
            'aria-invalid': amountError ? 'true' : 'false',
            style: styles.amountInput,
            onChange: (e) => {
              setAmountInput(e?.target?.value ?? '');
              if (amountError) {
                setAmountError(null);
              }
            },
          }),
          amountError
            ? h(
                'p',
                {
                  'data-testid': 'amount-error',
                  role: 'alert',
                  style: styles.errorMessage,
                },
                amountError,
              )
            : null,
        ),
        h(
          'div',
          { style: styles.fieldGroup },
          h(
            'label',
            { htmlFor: 'expense-category-select', style: styles.label },
            'Categoría (frecuentes primero)',
          ),
          h(
            'select',
            {
              id: 'expense-category-select',
              'data-testid': 'expense-category-select',
              value: String(categoryId),
              tabIndex: 0,
              style: styles.input,
              onChange: (e) => setCategoryId(Number(e?.target?.value ?? defaultCategoryId)),
            },
            ...categories.map((cat) =>
              h(
                'option',
                {
                  key: cat.id,
                  value: String(cat.id),
                  'data-testid': `category-option-${cat.id}`,
                },
                cat.name,
              ),
            ),
          ),
        ),
        h(
          'div',
          { style: styles.fieldGroup },
          h(
            'label',
            { htmlFor: 'expense-date-input', style: styles.label },
            'Fecha',
          ),
          h('input', {
            id: 'expense-date-input',
            'data-testid': 'expense-date-input',
            type: 'date',
            value: dateInput,
            tabIndex: 0,
            style: styles.input,
            onChange: (e) => setDateInput(e?.target?.value ?? defaultToday),
          }),
        ),
        h(
          'div',
          { style: styles.fieldGroup },
          h(
            'label',
            { htmlFor: 'expense-subcategory-input', style: styles.label },
            'Subcategoría (opcional)',
          ),
          h('input', {
            id: 'expense-subcategory-input',
            'data-testid': 'expense-subcategory-input',
            type: 'text',
            placeholder: 'Ej: Supermercado, Subte',
            value: subcategoryInput,
            tabIndex: 0,
            style: styles.input,
            onChange: (e) => setSubcategoryInput(e?.target?.value ?? ''),
          }),
        ),
        h(
          'div',
          { style: styles.fieldGroup },
          h(
            'label',
            { htmlFor: 'expense-note-input', style: styles.label },
            'Nota (opcional)',
          ),
          h('input', {
            id: 'expense-note-input',
            'data-testid': 'expense-note-input',
            type: 'text',
            placeholder: 'Detalle adicional',
            value: noteInput,
            tabIndex: 0,
            style: styles.input,
            onChange: (e) => setNoteInput(e?.target?.value ?? ''),
          }),
        ),
        formError
          ? h(
              'p',
              {
                'data-testid': 'form-error',
                role: 'alert',
                style: styles.errorMessage,
              },
              formError,
            )
          : null,
        h(
          'button',
          {
            type: 'submit',
            'data-testid': 'expense-submit-button',
            tabIndex: 0,
            style: styles.submitButton,
            onClick: handleConfirm,
          },
          isEditing ? 'Guardar cambios' : 'Guardar gasto',
        ),
        isEditing
          ? h(
              'button',
              {
                type: 'button',
                'data-testid': 'cancel-edit-button',
                tabIndex: 0,
                style: styles.cancelEditButton,
                onClick: handleCancelEdit,
              },
              'Cancelar edición',
            )
          : null,
      ),
      h(
        'section',
        {
          'data-testid': 'month-expense-list',
          style: styles.card,
          'aria-label': 'Gastos del mes',
        },
        h(
          'h2',
          {
            style: { marginTop: 0, marginBottom: 12, fontSize: layout.isMobile ? 19 : 22 },
          },
          `Gastos del mes (${activeYearMonth})`,
        ),
        h(
          'div',
          {
            'data-testid': 'month-total-summary',
            style: styles.monthSummaryBox,
          },
          h(
            'span',
            { style: { fontSize: 14, fontWeight: 600, color: '#475569' } },
            'Total del mes',
          ),
          h(
            'strong',
            {
              'data-testid': 'month-total-amount',
              style: { fontSize: 18, fontWeight: 700, color: '#0f172a' },
            },
            formatCentsToArs(monthlyTotalCents),
          ),
        ),
        expenses.length === 0
          ? h(
              'p',
              {
                'data-testid': 'empty-month-expenses',
                style: { margin: 0, color: '#64748b', fontSize: 15 },
              },
              'Todavía no registraste gastos en este mes.',
            )
          : h(
              'ul',
              {
                'data-testid': 'expense-items-ul',
                style: { listStyle: 'none', margin: 0, padding: 0 },
              },
              ...expenses.map((item) => {
                const itemId = item.id ?? 'draft';
                const isConfirmingDelete = confirmingDeleteId === item.id;
                return h(
                  'li',
                  {
                    key: item.id ?? `${item.date}-${item.amountCents}`,
                    'data-testid': `expense-item-${itemId}`,
                    style: styles.expenseItem,
                  },
                  h(
                    'div',
                    { style: styles.expenseItemMain },
                    h(
                      'div',
                      null,
                      h(
                        'strong',
                        {
                          'data-testid': 'expense-item-category',
                          style: { display: 'block', fontSize: 15, color: '#0f172a' },
                        },
                        item.subcategory
                          ? `${item.categoryName ?? 'Categoría'} · ${item.subcategory}`
                          : (item.categoryName ?? 'Categoría'),
                      ),
                      h(
                        'span',
                        {
                          'data-testid': 'expense-item-date',
                          style: { display: 'block', fontSize: 13, color: '#64748b' },
                        },
                        item.date,
                      ),
                      item.note
                        ? h(
                            'span',
                            {
                              'data-testid': 'expense-item-note',
                              style: {
                                display: 'block',
                                fontSize: 13,
                                color: '#475569',
                                marginTop: 2,
                              },
                            },
                            item.note,
                          )
                        : null,
                    ),
                    h(
                      'span',
                      {
                        'data-testid': 'expense-item-amount',
                        style: { fontWeight: 700, fontSize: 16, color: '#0f172a' },
                      },
                      formatCentsToArs(item.amountCents),
                    ),
                  ),
                  h(
                    'div',
                    { style: styles.actionRow },
                    h(
                      'button',
                      {
                        type: 'button',
                        'data-testid': `edit-expense-button-${itemId}`,
                        tabIndex: 0,
                        style: styles.actionButton,
                        onClick: () => handleStartEdit(item),
                      },
                      'Editar',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        'data-testid': `delete-expense-button-${itemId}`,
                        tabIndex: 0,
                        style: styles.deleteActionButton,
                        onClick: () => handleRequestDelete(item.id),
                      },
                      'Eliminar',
                    ),
                  ),
                  isConfirmingDelete
                    ? h(
                        'div',
                        {
                          'data-testid': `delete-confirm-box-${itemId}`,
                          role: 'region',
                          'aria-label': 'Confirmar eliminación de gasto',
                          style: styles.confirmBox,
                        },
                        h(
                          'span',
                          {
                            style: {
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#9f1239',
                            },
                          },
                          '¿Querés eliminar este gasto? Esta acción recalculará el total del mes.',
                        ),
                        h(
                          'div',
                          { style: styles.actionRow },
                          h(
                            'button',
                            {
                              type: 'button',
                              'data-testid': `confirm-delete-button-${itemId}`,
                              tabIndex: 0,
                              style: styles.confirmDeleteButton,
                              onClick: () => handleConfirmDelete(item.id),
                            },
                            'Confirmar eliminación',
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              'data-testid': `cancel-delete-button-${itemId}`,
                              tabIndex: 0,
                              style: styles.actionButton,
                              onClick: handleCancelDelete,
                            },
                            'Cancelar',
                          ),
                        ),
                      )
                    : null,
                );
              }),
            ),
      ),
    ),
  );
}

ExpenseFormScreen.createController = (options) => new ExpenseFormController(options);
ExpenseFormScreen.buildStyles = buildExpenseFormStyles;

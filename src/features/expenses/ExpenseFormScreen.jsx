import React, { useState, useEffect } from 'react';
import { Category } from '../../domain/models/category.js';
import { Expense } from '../../domain/models/expense.js';
import {
  DomainException,
  InvalidAmount,
  InvalidExpenseDate,
  InvalidCategory,
  DuplicateCategory,
  CategoryNotFound,
  PredefinedCategoryDeletionNotAllowed,
  CategoryInUse,
  ExpenseNotFound,
} from '../../core/errors.js';
import {
  formatIsoDate,
  formatIsoDateTime,
  extractYearMonth,
  isValidYearMonth,
  shiftYearMonth,
  formatYearMonthLabel,
} from '../../core/dates.js';
import {
  parseAmountToCents,
  formatCentsToArs,
  formatCentsToInput,
} from '../../core/formatters.js';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';
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
  let nextId =
    categories.reduce((max, cat) => Math.max(max, Number(cat.id) || 0), 0) + 1;
  let linkedExpensesRef = null;

  return {
    _linkExpenses(expensesArray) {
      linkedExpensesRef = expensesArray;
    },
    async findAll() {
      return [...categories];
    },
    async findById(id) {
      const numericId = Number(id);
      return categories.find((cat) => cat.id === numericId) ?? null;
    },
    async findByName(name) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return null;
      }
      const normalized = name.trim().toLowerCase();
      return (
        categories.find((cat) => cat.name.toLowerCase() === normalized) ?? null
      );
    },
    async save(category) {
      const draft =
        category instanceof Category
          ? category
          : new Category({
              id: category?.id ?? null,
              name: typeof category === 'string' ? category : category?.name,
              isPredefined: Boolean(category?.isPredefined),
              createdAt: category?.createdAt,
            });
      const existing = await this.findByName(draft.name);
      if (existing) {
        throw new DuplicateCategory(draft.name);
      }
      const saved = new Category({
        id: nextId++,
        name: draft.name,
        isPredefined: draft.isPredefined,
        createdAt: draft.createdAt ?? formatIsoDateTime(new Date()),
      });
      categories.push(saved);
      return saved;
    },
    async countExpenses(categoryId) {
      const numericId = Number(categoryId);
      if (!linkedExpensesRef) {
        return 0;
      }
      return linkedExpensesRef.filter((e) => e.categoryId === numericId).length;
    },
    async deleteById(id, options = {}) {
      const numericId = Number(id);
      const idx = categories.findIndex((cat) => cat.id === numericId);
      if (idx === -1) {
        throw new CategoryNotFound(numericId);
      }
      const target = categories[idx];
      if (target.isPredefined) {
        throw new PredefinedCategoryDeletionNotAllowed(target.name);
      }
      const count = await this.countExpenses(numericId);
      if (count > 0) {
        const reassignToCategoryId = options?.reassignToCategoryId;
        if (reassignToCategoryId === undefined || reassignToCategoryId === null) {
          throw new CategoryInUse(numericId, count);
        }
        const targetReassignId = Number(reassignToCategoryId);
        if (
          !Number.isInteger(targetReassignId) ||
          targetReassignId <= 0 ||
          targetReassignId === numericId
        ) {
          throw new InvalidCategory(
            'Seleccioná una categoría de destino válida y distinta a la que vas a eliminar',
          );
        }
        const dest = await this.findById(targetReassignId);
        if (!dest) {
          throw new CategoryNotFound(targetReassignId);
        }
        if (linkedExpensesRef) {
          const updatedAt = formatIsoDateTime(new Date());
          for (let i = 0; i < linkedExpensesRef.length; i += 1) {
            if (linkedExpensesRef[i].categoryId === numericId) {
              linkedExpensesRef[i] = linkedExpensesRef[i].copyWith({
                categoryId: dest.id,
                categoryName: dest.name,
                updatedAt,
              });
            }
          }
        }
      }
      categories.splice(idx, 1);
      return true;
    },
  };
}

function createInMemoryExpenseRepository(categoryRepository) {
  const expenses = [];
  if (categoryRepository && typeof categoryRepository._linkExpenses === 'function') {
    categoryRepository._linkExpenses(expenses);
  }
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
    async countByCategoryId(categoryId) {
      const numericId = Number(categoryId);
      return expenses.filter((item) => item.categoryId === numericId).length;
    },
    async reassignCategory(fromCategoryId, toCategoryId) {
      const fromId = Number(fromCategoryId);
      const toId = Number(toCategoryId);
      if (!Number.isInteger(toId) || toId <= 0 || toId === fromId) {
        throw new InvalidCategory(
          'Seleccioná una categoría de destino válida y distinta',
        );
      }
      const dest = categoryRepository ? await categoryRepository.findById(toId) : null;
      if (!dest) {
        throw new CategoryNotFound(toId);
      }
      let moved = 0;
      const updatedAt = formatIsoDateTime(new Date());
      for (let i = 0; i < expenses.length; i += 1) {
        if (expenses[i].categoryId === fromId) {
          expenses[i] = expenses[i].copyWith({
            categoryId: dest.id,
            categoryName: dest.name,
            updatedAt,
          });
          moved += 1;
        }
      }
      return moved;
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
      padding: layout.isMobile ? 4 : 8,
      maxWidth: layout.isMobile ? '100%' : layout.containerMaxWidth,
      margin: '0 auto',
      color: CORPORATE_THEME.textPrimary,
      fontFamily: CORPORATE_THEME.fontSans,
    }),
    grid: Object.freeze({
      display: 'grid',
      gridTemplateColumns:
        gridColumns === 1 ? '1fr' : 'minmax(0, 0.95fr) minmax(0, 1.05fr)',
      gap: layout.isMobile ? 16 : 22,
      alignItems: 'start',
    }),
    card: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.navyPrimary}`,
      borderRadius: 6,
      padding: layout.isMobile ? 16 : 22,
    }),
    fieldGroup: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      marginBottom: 14,
    }),
    label: Object.freeze({
      fontSize: 13,
      fontWeight: 600,
      color: CORPORATE_THEME.textSecondary,
    }),
    amountInput: Object.freeze({
      minHeight: 48,
      padding: '10px 14px',
      fontSize: 21,
      fontWeight: 700,
      fontFamily: CORPORATE_THEME.fontSerif,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
      borderRadius: 4,
      border: `2px solid ${CORPORATE_THEME.navyPrimary}`,
      boxSizing: 'border-box',
      width: '100%',
      backgroundColor: '#FFFFFF',
      color: '#0B192C',
      caretColor: '#0B192C',
      colorScheme: 'light',
    }),
    input: Object.freeze({
      minHeight: 44,
      padding: '9px 12px',
      fontSize: 14,
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      boxSizing: 'border-box',
      width: '100%',
      backgroundColor: '#ffffff',
      color: CORPORATE_THEME.textPrimary,
    }),
    errorMessage: Object.freeze({
      margin: '4px 0 0 0',
      padding: '7px 10px',
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.dangerBg,
      color: CORPORATE_THEME.danger,
      fontSize: 13,
      fontWeight: 600,
    }),
    submitButton: Object.freeze({
      minHeight: 48,
      width: '100%',
      padding: '12px 20px',
      borderRadius: 4,
      border: 'none',
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#ffffff',
      fontWeight: 600,
      fontSize: 15,
      cursor: 'pointer',
      marginTop: 4,
    }),
    cancelEditButton: Object.freeze({
      minHeight: 48,
      width: '100%',
      padding: '10px 18px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.brownPrimary}`,
      backgroundColor: CORPORATE_THEME.brownSoft,
      color: CORPORATE_THEME.brownPrimary,
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
      marginTop: 8,
    }),
    monthNavigationBar: Object.freeze({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      flexWrap: 'wrap',
    }),
    monthNavButton: Object.freeze({
      minHeight: 44,
      padding: '7px 12px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      backgroundColor: '#ffffff',
      color: CORPORATE_THEME.textPrimary,
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
    }),
    monthSummaryBox: Object.freeze({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 14px',
      marginBottom: 14,
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderLeft: `3px solid ${CORPORATE_THEME.brownPrimary}`,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
    emptyStateBox: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 12,
      padding: 16,
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px dashed ${CORPORATE_THEME.borderStrong}`,
    }),
    emptyStateCtaButton: Object.freeze({
      minHeight: 48,
      width: layout.isMobile ? '100%' : 'auto',
      padding: '10px 18px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.navyPrimary}`,
      backgroundColor: CORPORATE_THEME.navySoft,
      color: CORPORATE_THEME.navyPrimary,
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
    }),
    expenseItem: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '12px 0',
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
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
      padding: '6px 12px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      backgroundColor: '#ffffff',
      color: CORPORATE_THEME.textPrimary,
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
    }),
    deleteActionButton: Object.freeze({
      minHeight: 44,
      padding: '6px 12px',
      borderRadius: 4,
      border: '1px solid #fecaca',
      backgroundColor: CORPORATE_THEME.dangerBg,
      color: CORPORATE_THEME.danger,
      fontSize: 13,
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
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.dangerBg,
      border: '1px solid #fecdd3',
    }),
    confirmDeleteButton: Object.freeze({
      minHeight: 44,
      padding: '7px 14px',
      borderRadius: 4,
      border: 'none',
      backgroundColor: CORPORATE_THEME.danger,
      color: '#ffffff',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
    }),
    categoryCreateRow: Object.freeze({
      display: 'flex',
      flexDirection: layout.isMobile ? 'column' : 'row',
      gap: 10,
      alignItems: layout.isMobile ? 'stretch' : 'center',
      marginBottom: 14,
    }),
    createCategoryButton: Object.freeze({
      minHeight: 48,
      width: layout.isMobile ? '100%' : 'auto',
      padding: '10px 18px',
      borderRadius: 4,
      border: 'none',
      backgroundColor: CORPORATE_THEME.brownPrimary,
      color: '#ffffff',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }),
    categoryItemRow: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '10px 0',
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
    }),
    categoryItemMain: Object.freeze({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    }),
    reassignBox: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: 12,
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
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
    this.categoryExpenseCounts = {};
    this.currentYearMonth = extractYearMonth(initialDate);
    this.activeYearMonth = this.currentYearMonth;
    this.editingExpenseId = null;
    this.confirmingDeleteId = null;
    this.focusRequestedOnAmount = false;
    this.amountInput = '';
    this.dateInput = initialDate;
    this.categoryId = null;
    this.subcategoryInput = '';
    this.noteInput = '';
    this.amountError = null;
    this.formError = null;
    this.newCategoryNameInput = '';
    this.categoryError = null;
    this.deletingCategoryId = null;
    this.deletingCategoryExpenseCount = 0;
    this.reassignTargetCategoryId = null;
    this.initialized = false;
  }

  async refreshCategoryExpenseCounts(cats = this.categories) {
    const counts = {};
    for (const cat of cats) {
      if (typeof this.categoryRepository.countExpenses === 'function') {
        counts[cat.id] = await this.categoryRepository.countExpenses(cat.id);
      } else if (typeof this.expenseRepository.countByCategoryId === 'function') {
        counts[cat.id] = await this.expenseRepository.countByCategoryId(cat.id);
      } else {
        counts[cat.id] = this.expenses.filter((e) => e.categoryId === cat.id).length;
      }
    }
    this.categoryExpenseCounts = counts;
    return counts;
  }

  async initialize() {
    const loadedCategories = await this.categoryRepository.findAll();
    this.categories = loadedCategories;
    if (this.categoryId === null && loadedCategories.length > 0) {
      this.categoryId = loadedCategories[0].id;
    }
    const defaultDate = formatIsoDate(this.today());
    this.dateInput = defaultDate;
    this.currentYearMonth = extractYearMonth(defaultDate);
    this.activeYearMonth = this.currentYearMonth;
    this.expenses = await this.expenseRepository.findByYearMonth(this.activeYearMonth);
    await this.refreshCategoryExpenseCounts(loadedCategories);
    this.initialized = true;
    return this.getState();
  }

  setAmountInput(value) {
    this.amountInput = value === null || value === undefined ? '' : String(value);
    this.focusRequestedOnAmount = false;
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

  setNewCategoryNameInput(value) {
    this.newCategoryNameInput =
      value === null || value === undefined ? '' : String(value);
    if (this.categoryError) {
      this.categoryError = null;
    }
    return this.getState();
  }

  async createCustomCategory(nameOverride) {
    const rawName =
      nameOverride !== undefined ? nameOverride : this.newCategoryNameInput;
    this.categoryError = null;
    try {
      const draft = new Category({
        name: rawName,
        isPredefined: false,
        createdAt: formatIsoDateTime(this.now()),
      });
      const saved = await this.categoryRepository.save(draft);
      this.categories = await this.categoryRepository.findAll();
      await this.refreshCategoryExpenseCounts(this.categories);
      this.categoryId = saved.id;
      this.newCategoryNameInput = '';
      return this.getState();
    } catch (err) {
      if (err instanceof DomainException) {
        this.categoryError = err.message;
        return this.getState();
      }
      throw err;
    }
  }

  requestDeleteCategory(categoryId) {
    const numericId = Number(categoryId);
    this.categoryError = null;
    const target = this.categories.find((cat) => cat.id === numericId);
    if (!target) {
      this.categoryError = new CategoryNotFound(numericId).message;
      return this.getState();
    }
    if (target.isPredefined) {
      this.categoryError = new PredefinedCategoryDeletionNotAllowed(
        target.name,
      ).message;
      return this.getState();
    }

    const expenseCount = this.categoryExpenseCounts[numericId] ?? 0;
    this.deletingCategoryId = numericId;
    this.deletingCategoryExpenseCount = expenseCount;
    if (expenseCount > 0) {
      const fallbackTarget = this.categories.find((cat) => cat.id !== numericId);
      this.reassignTargetCategoryId = fallbackTarget ? fallbackTarget.id : null;
    } else {
      this.reassignTargetCategoryId = null;
    }
    return this.getState();
  }

  setReassignTargetCategoryId(categoryId) {
    this.reassignTargetCategoryId =
      categoryId !== null && categoryId !== undefined && categoryId !== ''
        ? Number(categoryId)
        : null;
    if (this.categoryError) {
      this.categoryError = null;
    }
    return this.getState();
  }

  cancelDeleteCategory() {
    this.deletingCategoryId = null;
    this.deletingCategoryExpenseCount = 0;
    this.reassignTargetCategoryId = null;
    this.categoryError = null;
    return this.getState();
  }

  async confirmDeleteCategory(categoryId, reassignToCategoryId) {
    const targetId =
      categoryId !== undefined && categoryId !== null
        ? Number(categoryId)
        : this.deletingCategoryId;
    const resolvedReassignId =
      reassignToCategoryId !== undefined
        ? reassignToCategoryId
        : this.reassignTargetCategoryId;

    this.categoryError = null;
    try {
      const options =
        resolvedReassignId !== null && resolvedReassignId !== undefined
          ? { reassignToCategoryId: Number(resolvedReassignId) }
          : {};
      await this.categoryRepository.deleteById(targetId, options);
      this.deletingCategoryId = null;
      this.deletingCategoryExpenseCount = 0;
      this.reassignTargetCategoryId = null;

      this.categories = await this.categoryRepository.findAll();
      this.expenses = await this.expenseRepository.findByYearMonth(
        this.activeYearMonth,
      );
      await this.refreshCategoryExpenseCounts(this.categories);

      if (this.categoryId === targetId) {
        const reassignedExists =
          resolvedReassignId !== null &&
          resolvedReassignId !== undefined &&
          this.categories.some((c) => c.id === Number(resolvedReassignId));
        this.categoryId = reassignedExists
          ? Number(resolvedReassignId)
          : (this.categories[0]?.id ?? null);
      }
      return this.getState();
    } catch (err) {
      if (err instanceof DomainException) {
        this.categoryError = err.message;
        return this.getState();
      }
      throw err;
    }
  }

  async goToYearMonth(targetYearMonth) {
    if (!isValidYearMonth(targetYearMonth)) {
      throw new InvalidExpenseDate('Período mensual inválido (AAAA-MM)');
    }
    const boundedMonth =
      targetYearMonth > this.currentYearMonth ? this.currentYearMonth : targetYearMonth;
    this.activeYearMonth = boundedMonth;
    this.confirmingDeleteId = null;
    this.expenses = await this.expenseRepository.findByYearMonth(this.activeYearMonth);
    return this.getState();
  }

  async goToPreviousMonth() {
    const previousMonth = shiftYearMonth(this.activeYearMonth, -1);
    return this.goToYearMonth(previousMonth);
  }

  async goToNextMonth() {
    if (this.activeYearMonth >= this.currentYearMonth) {
      return this.getState();
    }
    const nextMonth = shiftYearMonth(this.activeYearMonth, 1);
    return this.goToYearMonth(nextMonth);
  }

  activateEmptyStateCta() {
    this.editingExpenseId = null;
    this.confirmingDeleteId = null;
    this.amountError = null;
    this.formError = null;
    const defaultDate = formatIsoDate(this.today());
    this.dateInput =
      extractYearMonth(defaultDate) === this.activeYearMonth
        ? defaultDate
        : `${this.activeYearMonth}-01`;
    this.focusRequestedOnAmount = true;
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
    this.focusRequestedOnAmount = false;
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
      await this.refreshCategoryExpenseCounts(this.categories);
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
    this.focusRequestedOnAmount = false;

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
        await this.refreshCategoryExpenseCounts(this.categories);
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
      await this.refreshCategoryExpenseCounts(this.categories);

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
      categoryExpenseCounts: { ...this.categoryExpenseCounts },
      monthlyTotalCents,
      currentYearMonth: this.currentYearMonth,
      activeYearMonth: this.activeYearMonth,
      canGoNextMonth: this.activeYearMonth < this.currentYearMonth,
      editingExpenseId: this.editingExpenseId,
      confirmingDeleteId: this.confirmingDeleteId,
      focusRequestedOnAmount: this.focusRequestedOnAmount,
      amountInput: this.amountInput,
      dateInput: this.dateInput,
      categoryId: this.categoryId,
      subcategoryInput: this.subcategoryInput,
      noteInput: this.noteInput,
      amountError: this.amountError,
      formError: this.formError,
      newCategoryNameInput: this.newCategoryNameInput,
      categoryError: this.categoryError,
      deletingCategoryId: this.deletingCategoryId,
      deletingCategoryExpenseCount: this.deletingCategoryExpenseCount,
      reassignTargetCategoryId: this.reassignTargetCategoryId,
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
      initialCategoryExpenseCounts: state.categoryExpenseCounts,
      initialActiveYearMonth: state.activeYearMonth,
      initialEditingExpenseId: state.editingExpenseId,
      initialConfirmingDeleteId: state.confirmingDeleteId,
      initialFocusRequested: state.focusRequestedOnAmount,
      initialAmount: state.amountInput,
      initialDate: state.dateInput,
      initialCategoryId: state.categoryId,
      initialSubcategory: state.subcategoryInput,
      initialNote: state.noteInput,
      initialAmountError: state.amountError,
      initialFormError: state.formError,
      initialNewCategoryName: state.newCategoryNameInput,
      initialCategoryError: state.categoryError,
      initialDeletingCategoryId: state.deletingCategoryId,
      initialDeletingCategoryExpenseCount: state.deletingCategoryExpenseCount,
      initialReassignTargetCategoryId: state.reassignTargetCategoryId,
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
  initialCategoryExpenseCounts = undefined,
  initialActiveYearMonth = undefined,
  initialEditingExpenseId = null,
  initialConfirmingDeleteId = null,
  initialFocusRequested = false,
  initialAmount = '',
  initialDate = undefined,
  initialCategoryId = undefined,
  initialSubcategory = '',
  initialNote = '',
  initialAmountError = null,
  initialFormError = null,
  initialNewCategoryName = '',
  initialCategoryError = null,
  initialDeletingCategoryId = null,
  initialDeletingCategoryExpenseCount = 0,
  initialReassignTargetCategoryId = null,
  today = () => formatIsoDate(new Date()),
  now = () => new Date(),
  viewportWidth = 390,
  onExpenseSaved = undefined,
  onCategoriesChanged = undefined,
} = {}) {
  const defaultToday = formatIsoDate(today());
  const currentYearMonth = extractYearMonth(defaultToday);
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
  const [categoryExpenseCounts, setCategoryExpenseCounts] = useState(
    () => initialCategoryExpenseCounts ?? {},
  );
  const [activeYearMonth, setActiveYearMonth] = useState(
    initialActiveYearMonth && isValidYearMonth(initialActiveYearMonth)
      ? initialActiveYearMonth
      : currentYearMonth,
  );
  const [editingExpenseId, setEditingExpenseId] = useState(initialEditingExpenseId);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(
    initialConfirmingDeleteId,
  );
  const [focusRequestedOnAmount, setFocusRequestedOnAmount] = useState(
    initialFocusRequested,
  );
  const [amountInput, setAmountInput] = useState(initialAmount);
  const [dateInput, setDateInput] = useState(initialDate ?? defaultToday);
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [subcategoryInput, setSubcategoryInput] = useState(initialSubcategory);
  const [noteInput, setNoteInput] = useState(initialNote);
  const [amountError, setAmountError] = useState(initialAmountError);
  const [formError, setFormError] = useState(initialFormError);
  const [newCategoryNameInput, setNewCategoryNameInput] = useState(
    initialNewCategoryName,
  );
  const [categoryError, setCategoryError] = useState(initialCategoryError);
  const [deletingCategoryId, setDeletingCategoryId] = useState(
    initialDeletingCategoryId,
  );
  const [deletingCategoryExpenseCount, setDeletingCategoryExpenseCount] = useState(
    initialDeletingCategoryExpenseCount,
  );
  const [reassignTargetCategoryId, setReassignTargetCategoryId] = useState(
    initialReassignTargetCategoryId,
  );

  const loadCountsForCategories = async (cats, currentExpenses = expenses) => {
    const counts = {};
    for (const cat of cats) {
      if (typeof catRepo.countExpenses === 'function') {
        counts[cat.id] = await catRepo.countExpenses(cat.id);
      } else if (typeof expRepo.countByCategoryId === 'function') {
        counts[cat.id] = await expRepo.countByCategoryId(cat.id);
      } else {
        counts[cat.id] = currentExpenses.filter((e) => e.categoryId === cat.id).length;
      }
    }
    setCategoryExpenseCounts(counts);
    return counts;
  };

  useEffect(() => {
    let active = true;
    if (initialCategories !== undefined && initialExpenses !== undefined) {
      return undefined;
    }
    Promise.all([
      catRepo.findAll(),
      expRepo.findByYearMonth(activeYearMonth),
    ]).then(async ([loadedCats, loadedExpenses]) => {
      if (!active) {
        return;
      }
      setCategories(loadedCats);
      if (loadedCats.length > 0 && !loadedCats.some((c) => c.id === categoryId)) {
        setCategoryId(loadedCats[0].id);
      }
      setExpenses(loadedExpenses);
      const counts = {};
      for (const cat of loadedCats) {
        if (typeof catRepo.countExpenses === 'function') {
          counts[cat.id] = await catRepo.countExpenses(cat.id);
        } else {
          counts[cat.id] = loadedExpenses.filter((e) => e.categoryId === cat.id).length;
        }
      }
      if (active) {
        setCategoryExpenseCounts(counts);
      }
    });
    return () => {
      active = false;
    };
  }, [catRepo, expRepo, activeYearMonth, categoryId, initialCategories, initialExpenses]);

  const styles = buildExpenseFormStyles(viewportWidth);
  const { layout, gridColumns } = styles;
  const layoutMode = layout.isDesktop
    ? 'desktop'
    : layout.isTablet
      ? 'tablet'
      : 'mobile';

  const monthlyTotalCents = calculateMonthlyTotalCents(expenses);
  const isEditing = editingExpenseId !== null && editingExpenseId !== undefined;
  const canGoNextMonth = activeYearMonth < currentYearMonth;

  const handlePreviousMonth = async () => {
    const previousMonth = shiftYearMonth(activeYearMonth, -1);
    setActiveYearMonth(previousMonth);
    setConfirmingDeleteId(null);
    const updatedList = await expRepo.findByYearMonth(previousMonth);
    setExpenses(updatedList);
  };

  const handleNextMonth = async () => {
    if (!canGoNextMonth) {
      return;
    }
    const nextMonth = shiftYearMonth(activeYearMonth, 1);
    const boundedMonth = nextMonth > currentYearMonth ? currentYearMonth : nextMonth;
    setActiveYearMonth(boundedMonth);
    setConfirmingDeleteId(null);
    const updatedList = await expRepo.findByYearMonth(boundedMonth);
    setExpenses(updatedList);
  };

  const handleEmptyStateCta = () => {
    setEditingExpenseId(null);
    setConfirmingDeleteId(null);
    setAmountError(null);
    setFormError(null);
    setDateInput(
      activeYearMonth === currentYearMonth ? defaultToday : `${activeYearMonth}-01`,
    );
    setFocusRequestedOnAmount(true);
    if (typeof document !== 'undefined') {
      const amountEl = document.getElementById('expense-amount-input');
      if (amountEl && typeof amountEl.focus === 'function') {
        amountEl.focus();
      }
    }
  };

  const handleStartEdit = (item) => {
    setEditingExpenseId(item.id);
    setConfirmingDeleteId(null);
    setFocusRequestedOnAmount(false);
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
      await loadCountsForCategories(updatedCategories, updatedList);
    } catch (err) {
      setConfirmingDeleteId(null);
      if (err instanceof DomainException) {
        setFormError(err.message);
        return;
      }
      throw err;
    }
  };

  const handleCreateCategory = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    setCategoryError(null);
    try {
      const draft = new Category({
        name: newCategoryNameInput,
        isPredefined: false,
        createdAt: formatIsoDateTime(now()),
      });
      const saved = await catRepo.save(draft);
      const updatedCategories = await catRepo.findAll();
      setCategories(updatedCategories);
      await loadCountsForCategories(updatedCategories, expenses);
      setCategoryId(saved.id);
      setNewCategoryNameInput('');
      if (typeof onCategoriesChanged === 'function') {
        onCategoriesChanged(updatedCategories);
      }
      return saved;
    } catch (err) {
      if (err instanceof DomainException) {
        setCategoryError(err.message);
        return null;
      }
      throw err;
    }
  };

  const handleRequestDeleteCategory = async (cat) => {
    setCategoryError(null);
    if (cat.isPredefined) {
      setCategoryError(
        new PredefinedCategoryDeletionNotAllowed(cat.name).message,
      );
      return;
    }
    const count =
      typeof catRepo.countExpenses === 'function'
        ? await catRepo.countExpenses(cat.id)
        : (categoryExpenseCounts[cat.id] ?? 0);
    setDeletingCategoryId(cat.id);
    setDeletingCategoryExpenseCount(count);
    if (count > 0) {
      const fallback = categories.find((c) => c.id !== cat.id);
      setReassignTargetCategoryId(fallback ? fallback.id : null);
    } else {
      setReassignTargetCategoryId(null);
    }
  };

  const handleCancelDeleteCategory = () => {
    setDeletingCategoryId(null);
    setDeletingCategoryExpenseCount(0);
    setReassignTargetCategoryId(null);
    setCategoryError(null);
  };

  const handleConfirmDeleteCategory = async (catId, targetReassignId = reassignTargetCategoryId) => {
    setCategoryError(null);
    try {
      const options =
        targetReassignId !== null && targetReassignId !== undefined
          ? { reassignToCategoryId: Number(targetReassignId) }
          : {};
      await catRepo.deleteById(catId, options);
      setDeletingCategoryId(null);
      setDeletingCategoryExpenseCount(0);
      setReassignTargetCategoryId(null);

      const updatedCategories = await catRepo.findAll();
      const updatedExpenses = await expRepo.findByYearMonth(activeYearMonth);
      setCategories(updatedCategories);
      setExpenses(updatedExpenses);
      await loadCountsForCategories(updatedCategories, updatedExpenses);

      if (Number(categoryId) === Number(catId)) {
        const nextCat =
          targetReassignId &&
          updatedCategories.some((c) => c.id === Number(targetReassignId))
            ? Number(targetReassignId)
            : (updatedCategories[0]?.id ?? 1);
        setCategoryId(nextCat);
      }
      if (typeof onCategoriesChanged === 'function') {
        onCategoriesChanged(updatedCategories);
      }
    } catch (err) {
      if (err instanceof DomainException) {
        setCategoryError(err.message);
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
    setFocusRequestedOnAmount(false);

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
        await loadCountsForCategories(updatedCategories, updatedList);
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
      const savedYearMonth = extractYearMonth(saved.date);
      setActiveYearMonth(savedYearMonth);
      const updatedList = await expRepo.findByYearMonth(savedYearMonth);
      const updatedCategories = await catRepo.findAll();
      setExpenses(updatedList);
      setCategories(updatedCategories);
      await loadCountsForCategories(updatedCategories, updatedList);
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
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: layout.isMobile ? 16 : 20,
          },
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
              'data-focus-requested': focusRequestedOnAmount ? 'true' : 'false',
              type: 'text',
              inputMode: 'decimal',
              placeholder: 'Ej: 1500,50',
              value: amountInput,
              tabIndex: 0,
              'aria-invalid': amountError ? 'true' : 'false',
              style: styles.amountInput,
              onChange: (e) => {
                setAmountInput(e?.target?.value ?? '');
                setFocusRequestedOnAmount(false);
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
            'data-testid': 'category-manager-section',
            'aria-label': 'Gestión de categorías',
            style: {
              ...styles.card,
              borderTop: `2px solid ${CORPORATE_THEME.brownPrimary}`,
            },
          },
          h(
            'h3',
            {
              style: {
                marginTop: 0,
                marginBottom: 8,
                fontSize: layout.isMobile ? 17 : 19,
                color: CORPORATE_THEME.navyPrimary,
              },
            },
            'Categorías propias y predefinidas',
          ),
          h(
            'p',
            {
              style: {
                marginTop: 0,
                marginBottom: 12,
                fontSize: 13,
                color: CORPORATE_THEME.textSecondary,
              },
            },
            'Creá tus propias categorías para clasificar gastos o eliminá las personalizadas reasignando sus registros.',
          ),
          h(
            'div',
            { style: styles.categoryCreateRow },
            h('input', {
              id: 'new-category-name-input',
              'data-testid': 'new-category-name-input',
              type: 'text',
              placeholder: 'Nombre de nueva categoría (ej: Mascotas)',
              value: newCategoryNameInput,
              tabIndex: 0,
              style: styles.input,
              onChange: (e) => {
                setNewCategoryNameInput(e?.target?.value ?? '');
                if (categoryError) {
                  setCategoryError(null);
                }
              },
            }),
            h(
              'button',
              {
                type: 'button',
                'data-testid': 'create-category-button',
                tabIndex: 0,
                style: styles.createCategoryButton,
                onClick: handleCreateCategory,
              },
              'Crear categoría',
            ),
          ),
          categoryError
            ? h(
                'p',
                {
                  'data-testid': 'category-error',
                  role: 'alert',
                  style: styles.errorMessage,
                },
                categoryError,
              )
            : null,
          h(
            'ul',
            {
              'data-testid': 'category-manager-list',
              style: { listStyle: 'none', margin: 0, padding: 0 },
            },
            ...categories.map((cat) => {
              const catExpenseCount = categoryExpenseCounts[cat.id] ?? 0;
              const isDeletingThis = deletingCategoryId === cat.id;
              const availableTargets = categories.filter((c) => c.id !== cat.id);
              const selectedTarget =
                reassignTargetCategoryId ?? availableTargets[0]?.id ?? '';

              return h(
                'li',
                {
                  key: cat.id,
                  'data-testid': `category-manager-item-${cat.id}`,
                  style: styles.categoryItemRow,
                },
                h(
                  'div',
                  { style: styles.categoryItemMain },
                  h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                    h(
                      'strong',
                      {
                        'data-testid': `category-manager-name-${cat.id}`,
                        style: { fontSize: 14, color: CORPORATE_THEME.textPrimary },
                      },
                      cat.name,
                    ),
                    cat.isPredefined
                      ? h(
                          'span',
                          {
                            'data-testid': `predefined-badge-${cat.id}`,
                            style: {
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: CORPORATE_THEME.navySoft,
                              color: CORPORATE_THEME.navyPrimary,
                            },
                          },
                          'Predefinida',
                        )
                      : h(
                          'span',
                          {
                            'data-testid': `custom-badge-${cat.id}`,
                            style: {
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: CORPORATE_THEME.brownSoft,
                              color: CORPORATE_THEME.brownPrimary,
                            },
                          },
                          'Propia',
                        ),
                    h(
                      'span',
                      {
                        'data-testid': `category-expense-count-${cat.id}`,
                        style: {
                          fontSize: 12,
                          color: CORPORATE_THEME.textMuted,
                          fontVariantNumeric: CORPORATE_THEME.tabularNums,
                        },
                      },
                      `(${catExpenseCount} ${catExpenseCount === 1 ? 'gasto' : 'gastos'})`,
                    ),
                  ),
                  !cat.isPredefined
                    ? h(
                        'button',
                        {
                          type: 'button',
                          'data-testid': `delete-category-button-${cat.id}`,
                          tabIndex: 0,
                          style: styles.deleteActionButton,
                          onClick: () => handleRequestDeleteCategory(cat),
                        },
                        'Eliminar categoría',
                      )
                    : null,
                ),
                isDeletingThis && !cat.isPredefined
                  ? deletingCategoryExpenseCount > 0
                    ? h(
                        'div',
                        {
                          'data-testid': `reassign-category-box-${cat.id}`,
                          role: 'region',
                          'aria-label': `Reasignar gastos de ${cat.name}`,
                          style: styles.reassignBox,
                        },
                        h(
                          'span',
                          {
                            style: {
                              fontSize: 13,
                              fontWeight: 600,
                              color: CORPORATE_THEME.textPrimary,
                            },
                          },
                          `Esta categoría tiene ${deletingCategoryExpenseCount} gasto(s) asociado(s). Elegí a qué categoría reasignarlos antes de eliminarla:`,
                        ),
                        h(
                          'select',
                          {
                            'data-testid': `reassign-target-select-${cat.id}`,
                            value: String(selectedTarget),
                            tabIndex: 0,
                            style: styles.input,
                            onChange: (e) =>
                              setReassignTargetCategoryId(
                                Number(e?.target?.value ?? selectedTarget),
                              ),
                          },
                          ...availableTargets.map((targetCat) =>
                            h(
                              'option',
                              {
                                key: targetCat.id,
                                value: String(targetCat.id),
                                'data-testid': `reassign-option-${cat.id}-${targetCat.id}`,
                              },
                              targetCat.name,
                            ),
                          ),
                        ),
                        h(
                          'div',
                          { style: styles.actionRow },
                          h(
                            'button',
                            {
                              type: 'button',
                              'data-testid': `confirm-reassign-delete-button-${cat.id}`,
                              tabIndex: 0,
                              style: styles.confirmDeleteButton,
                              onClick: () =>
                                handleConfirmDeleteCategory(cat.id, selectedTarget),
                            },
                            'Reasignar y eliminar',
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              'data-testid': `cancel-delete-category-button-${cat.id}`,
                              tabIndex: 0,
                              style: styles.actionButton,
                              onClick: handleCancelDeleteCategory,
                            },
                            'Cancelar',
                          ),
                        ),
                      )
                    : h(
                        'div',
                        {
                          'data-testid': `confirm-delete-category-box-${cat.id}`,
                          role: 'region',
                          'aria-label': `Confirmar eliminación de ${cat.name}`,
                          style: styles.confirmBox,
                        },
                        h(
                          'span',
                          {
                            style: {
                              fontSize: 13,
                              fontWeight: 600,
                              color: CORPORATE_THEME.danger,
                            },
                          },
                          `¿Querés eliminar la categoría propia "${cat.name}"?`,
                        ),
                        h(
                          'div',
                          { style: styles.actionRow },
                          h(
                            'button',
                            {
                              type: 'button',
                              'data-testid': `confirm-delete-category-button-${cat.id}`,
                              tabIndex: 0,
                              style: styles.confirmDeleteButton,
                              onClick: () => handleConfirmDeleteCategory(cat.id, null),
                            },
                            'Confirmar eliminación',
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              'data-testid': `cancel-delete-category-button-${cat.id}`,
                              tabIndex: 0,
                              style: styles.actionButton,
                              onClick: handleCancelDeleteCategory,
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
            'data-testid': 'month-navigation-bar',
            style: styles.monthNavigationBar,
          },
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'prev-month-button',
              tabIndex: 0,
              style: styles.monthNavButton,
              onClick: handlePreviousMonth,
            },
            '← Mes anterior',
          ),
          h(
            'span',
            {
              'data-testid': 'active-month-label',
              style: { fontSize: 14, fontWeight: 700, color: '#334155' },
            },
            formatYearMonthLabel(activeYearMonth),
          ),
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'next-month-button',
              tabIndex: 0,
              disabled: !canGoNextMonth,
              style: {
                ...styles.monthNavButton,
                opacity: canGoNextMonth ? 1 : 0.45,
                cursor: canGoNextMonth ? 'pointer' : 'not-allowed',
              },
              onClick: handleNextMonth,
            },
            'Mes siguiente →',
          ),
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
              'div',
              {
                'data-testid': 'empty-month-expenses',
                style: styles.emptyStateBox,
              },
              h(
                'p',
                {
                  style: { margin: 0, color: '#64748b', fontSize: 15 },
                },
                'Todavía no registraste gastos en este mes.',
              ),
              h(
                'button',
                {
                  type: 'button',
                  'data-testid': 'empty-state-cta-button',
                  tabIndex: 0,
                  style: styles.emptyStateCtaButton,
                  onClick: handleEmptyStateCta,
                },
                'Registrar gasto en este mes',
              ),
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

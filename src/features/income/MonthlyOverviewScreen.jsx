import React, { useState, useEffect } from 'react';
import { Category } from '../../domain/models/category.js';
import { Expense } from '../../domain/models/expense.js';
import {
  MonthlyIncome,
  IncomeEntry,
  sumIncomeEntries,
  calculateCategoryIncomeBreakdown,
} from '../../domain/models/monthlyIncome.js';
import { Investment } from '../../domain/models/investment.js';
import { Reminder } from '../../domain/models/reminder.js';
import { buildCategoryRanking } from '../../domain/services/categoryRanking.js';
import { buildMonthlyComparison } from '../../domain/services/monthlyComparison.js';
import {
  DomainException,
  InvalidAmount,
  InvalidCategory,
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
  formatVariationTenths,
} from '../../core/formatters.js';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';
import { PREDEFINED_CATEGORIES } from '../../data/db/appDatabase.js';
import { ExpenseFormScreen } from '../expenses/ExpenseFormScreen.jsx';
import { CategoryDistributionChart } from './CategoryDistributionChart.jsx';
import { CategoryRankingList } from '../dashboard/CategoryRankingList.jsx';
import { MonthlyComparisonPanel } from '../dashboard/MonthlyComparisonPanel.jsx';
import { loadPreviousMonthlyTotals } from '../dashboard/monthlyTotalsLoader.js';
import { RecurrencesPanel } from '../recurrences/RecurrencesPanel.jsx';
import { loadVisibleRecurrences } from '../recurrences/recurrencesLoader.js';
import { RecommendationsPanel } from '../advice/RecommendationsPanel.jsx';
import { loadSpendingSummary } from '../advice/adviceSummaryLoader.js';
import { AdviceService } from '../../assistant/adviceService.js';
import { buildFallbackAdvice } from '../../assistant/fallbackAdvisor.js';
import { buildSpendingSummary } from '../../domain/services/spendingSummaryBuilder.js';
import { MONTHLY_MODEL_REQUEST_LIMIT } from '../../domain/models/adviceRequest.js';
import { ExportHistoryPanel } from '../export/ExportHistoryPanel.jsx';
import { buildIdleExportState, exportHistory } from '../export/exportHistory.js';
import { createBrowserCsvDelivery } from '../export/csvDelivery.js';

const RECURRENCE_DISMISS_ERROR_MESSAGE = 'No se pudo descartar la recurrencia. Probá de nuevo.';

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

function createInMemoryCategoryRepository(seed = buildDefaultCategories()) {
  const list = [...seed];
  return {
    async findAll() {
      return [...list];
    },
    async findById(id) {
      return list.find((c) => c.id === id) ?? null;
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
      const saved = new Expense({
        id: nextId++,
        amountCents: record.amountCents,
        date: record.date,
        categoryId: record.categoryId,
        categoryName: category.name,
        subcategory: record.subcategory,
        note: record.note,
        createdAt: record.createdAt ?? nowIso,
        updatedAt: record.updatedAt ?? record.createdAt ?? nowIso,
      });
      expenses.push(saved);
      return saved;
    },
    async findById(id) {
      return expenses.find((e) => e.id === id) ?? null;
    },
    async findAll() {
      return [...expenses].sort((a, b) =>
        a.date !== b.date ? a.date.localeCompare(b.date) : (a.id ?? 0) - (b.id ?? 0),
      );
    },
    async findByYearMonth(yearMonth) {
      return expenses
        .filter((e) => e.date.slice(0, 7) === yearMonth)
        .sort((a, b) =>
          a.date !== b.date ? b.date.localeCompare(a.date) : (b.id ?? 0) - (a.id ?? 0),
        );
    },
    async update(expense) {
      const record = expense instanceof Expense ? expense : new Expense(expense);
      const idx = expenses.findIndex((e) => e.id === record.id);
      if (idx === -1) {
        throw new ExpenseNotFound(record.id);
      }
      const category = categoryRepository
        ? await categoryRepository.findById(record.categoryId)
        : null;
      if (!category) {
        throw new InvalidCategory('Seleccioná una categoría válida');
      }
      const updated = new Expense({
        id: record.id,
        amountCents: record.amountCents,
        date: record.date,
        categoryId: record.categoryId,
        categoryName: category.name,
        subcategory: record.subcategory,
        note: record.note,
        createdAt: expenses[idx].createdAt,
        updatedAt: record.updatedAt ?? formatIsoDateTime(new Date()),
      });
      expenses[idx] = updated;
      return updated;
    },
    async deleteById(id) {
      const idx = expenses.findIndex((e) => e.id === id);
      if (idx === -1) {
        throw new ExpenseNotFound(id);
      }
      expenses.splice(idx, 1);
      return true;
    },
  };
}

function createInMemoryIncomeRepository() {
  const map = new Map();
  const entries = [];
  let nextId = 1;

  const syncYearMonth = (yearMonth) => {
    const total = sumIncomeEntries(entries, yearMonth);
    if (total > 0) {
      map.set(
        yearMonth,
        new MonthlyIncome({
          yearMonth,
          amountCents: total,
          updatedAt: formatIsoDateTime(new Date()),
        }),
      );
    } else {
      map.delete(yearMonth);
    }
  };

  return {
    async addEntry(entry) {
      const record = entry instanceof IncomeEntry ? entry : new IncomeEntry(entry);
      const saved = new IncomeEntry({
        id: nextId++,
        amountCents: record.amountCents,
        date: record.date,
        note: record.note,
        createdAt: record.createdAt ?? formatIsoDateTime(new Date()),
      });
      entries.push(saved);
      syncYearMonth(saved.yearMonth);
      return saved;
    },
    async findEntriesByYearMonth(yearMonth) {
      return entries
        .filter((e) => e.yearMonth === yearMonth)
        .sort((a, b) =>
          a.date !== b.date ? b.date.localeCompare(a.date) : (b.id ?? 0) - (a.id ?? 0),
        );
    },
    async updateEntry(entry) {
      const record = entry instanceof IncomeEntry ? entry : new IncomeEntry(entry);
      const idx = entries.findIndex((e) => e.id === record.id);
      if (idx === -1) {
        throw new InvalidAmount('El ingreso seleccionado no existe');
      }
      const prevYm = entries[idx].yearMonth;
      const updated = new IncomeEntry({
        id: record.id,
        amountCents: record.amountCents,
        date: record.date,
        note: record.note,
        createdAt: entries[idx].createdAt,
      });
      entries[idx] = updated;
      syncYearMonth(updated.yearMonth);
      if (prevYm !== updated.yearMonth) {
        syncYearMonth(prevYm);
      }
      return updated;
    },
    async deleteEntryById(id) {
      const idx = entries.findIndex((e) => e.id === id);
      if (idx === -1) {
        throw new InvalidAmount('El ingreso seleccionado no existe');
      }
      const ym = entries[idx].yearMonth;
      entries.splice(idx, 1);
      syncYearMonth(ym);
      return true;
    },
    async save(income) {
      const record =
        income instanceof MonthlyIncome ? income : new MonthlyIncome(income);
      map.set(record.yearMonth, record);
      return record;
    },
    async findByYearMonth(yearMonth) {
      return map.get(yearMonth) ?? null;
    },
  };
}

function createInMemoryInvestmentRepository() {
  const list = [];
  let nextId = 1;
  return {
    async save(investment) {
      const record =
        investment instanceof Investment ? investment : new Investment(investment);
      const saved = new Investment({
        id: nextId++,
        assetName: record.assetName,
        platform: record.platform,
        amountCents: record.amountCents,
        date: record.date,
        dueDate: record.dueDate,
        note: record.note,
        createdAt: record.createdAt ?? formatIsoDateTime(new Date()),
      });
      list.push(saved);
      return saved;
    },
    async findByYearMonth(yearMonth) {
      return list
        .filter((i) => i.date.slice(0, 7) === yearMonth)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
  };
}

function createInMemoryReminderRepository() {
  const list = [];
  let nextId = 1;
  return {
    async save(reminder) {
      const record =
        reminder instanceof Reminder ? reminder : new Reminder(reminder);
      const saved = new Reminder({
        id: nextId++,
        title: record.title,
        dueDate: record.dueDate,
        amountCents: record.amountCents,
        isCompleted: record.isCompleted,
        createdAt: record.createdAt ?? formatIsoDateTime(new Date()),
      });
      list.push(saved);
      return saved;
    },
    async findAll() {
      return [...list].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    },
  };
}

function createInMemoryRecurrenceRepository() {
  const dismissed = new Map();
  return {
    async dismissedKeys() {
      return new Set(dismissed.keys());
    },
    async dismiss(recurrenceKey, dismissedAt = formatIsoDateTime(new Date())) {
      if (!dismissed.has(recurrenceKey)) {
        dismissed.set(recurrenceKey, dismissedAt);
      }
    },
  };
}

function createInMemoryAdviceRequestRepository() {
  const rows = [];
  let lastSnapshot = null;
  return {
    async countByDate(date, source = 'model') {
      return rows.filter(
        (row) =>
          typeof row.createdAt === 'string' &&
          row.createdAt.slice(0, 10) === date &&
          row.source === source,
      ).length;
    },
    async countByYearMonth(yearMonth, source = 'model') {
      return rows.filter((row) => row.yearMonth === yearMonth && row.source === source).length;
    },
    async save(adviceRequest) {
      const saved = adviceRequest.copyWith({ id: rows.length + 1 });
      rows.push(saved);
      return saved;
    },
    async saveDailyAdviceSnapshot(snapshot) {
      if (!snapshot || typeof snapshot.date !== 'string') {
        return null;
      }
      lastSnapshot = Object.freeze({
        date: snapshot.date,
        yearMonth: snapshot.yearMonth ?? snapshot.date.slice(0, 7),
        suggestions: Object.freeze(
          Array.isArray(snapshot.suggestions) ? [...snapshot.suggestions] : [],
        ),
        source: snapshot.source ?? 'fallback',
        reason: snapshot.reason ?? null,
      });
      return lastSnapshot;
    },
    async findDailyAdviceSnapshot(date, yearMonth = undefined) {
      if (!lastSnapshot || lastSnapshot.date !== date) {
        return null;
      }
      if (yearMonth !== undefined && lastSnapshot.yearMonth !== yearMonth) {
        return null;
      }
      return lastSnapshot;
    },
  };
}

function buildIdleAdviceState(remainingModelRequests = MONTHLY_MODEL_REQUEST_LIMIT) {
  return Object.freeze({
    status: 'idle',
    suggestions: Object.freeze([]),
    source: null,
    reason: null,
    remainingModelRequests,
  });
}

function buildReadyAdviceState(result) {
  return Object.freeze({
    status: 'ready',
    suggestions: result.suggestions,
    source: result.source,
    reason: result.reason,
    remainingModelRequests: result.remainingModelRequests,
  });
}

async function resolveAdvice({
  adviceService,
  expenseRepository,
  incomeRepository,
  categories,
  yearMonth,
  recurrences,
  remainingModelRequests,
}) {
  let summary;
  try {
    summary = await loadSpendingSummary({
      expenseRepository,
      incomeRepository,
      categories,
      yearMonth,
      recurrences,
    });
  } catch {
    const emptySummary = buildSpendingSummary({ yearMonth });
    return buildReadyAdviceState({
      suggestions: buildFallbackAdvice(emptySummary).sugerencias,
      source: 'fallback',
      reason: 'no_data',
      remainingModelRequests,
    });
  }
  try {
    return buildReadyAdviceState(await adviceService.requestAdvice(summary));
  } catch {
    return buildReadyAdviceState({
      suggestions: buildFallbackAdvice(summary).sugerencias,
      source: 'fallback',
      reason: 'request_failed',
      remainingModelRequests,
    });
  }
}

function buildAdviceItems({
  monthlyIncome,
  expenses,
  investments,
  breakdown,
  reminders,
}) {
  const suggestions = [];
  const totalExpenses = expenses.reduce((s, e) => s + e.amountCents, 0);
  const totalInvestments = investments.reduce((s, i) => s + i.amountCents, 0);

  if (monthlyIncome && monthlyIncome.amountCents > 0) {
    const spentPct = Math.round((totalExpenses * 100) / monthlyIncome.amountCents);
    const investedPct = Math.round((totalInvestments * 100) / monthlyIncome.amountCents);
    if (spentPct > 80) {
      suggestions.push(
        `Tus gastos representan el ${spentPct} % del ingreso mensual registrado. Revisá la categoría principal para preservar margen de liquidez.`,
      );
    } else {
      suggestions.push(
        `Llevás utilizado el ${spentPct} % de tu ingreso en gastos corrientes y destinaste el ${investedPct} % a inversiones registradas.`,
      );
    }
  } else {
    suggestions.push(
      'Registrá tu ingreso mensual para visualizar qué porcentaje representa cada categoría de gasto sobre tu capital disponible.',
    );
  }

  if (breakdown.length > 0) {
    const top = breakdown[0];
    suggestions.push(
      `La categoría con mayor peso del mes es ${top.categoryName} (${formatCentsToArs(top.amountCents)}${top.incomePercentage !== null ? `, ${top.incomePercentage} % del ingreso` : ''}).`,
    );
  }

  const dueInvestments = investments.filter((inv) => Boolean(inv.dueDate));
  if (dueInvestments.length > 0 || reminders.length > 0) {
    const totalAlerts = dueInvestments.length + reminders.length;
    suggestions.push(
      `Tenés ${totalAlerts} vencimiento(s) o recordatorio(s) agendados (incluyendo instrumentos como Plazo Fijo). Verificá las fechas para decidir su renovación o disponibilidad.`,
    );
  }

  return suggestions.slice(0, 3);
}

function buildOverviewStyles(viewportWidth = 390) {
  const layout = getViewportLayout(viewportWidth);
  const gridColumns = layout.columns;

  return Object.freeze({
    layout,
    gridColumns,
    theme: CORPORATE_THEME,
    wrapper: Object.freeze({
      width: layout.isDesktop ? layout.desktopContainerWidth : '100%',
      boxSizing: 'border-box',
      padding: layout.isMobile
        ? '4px 6px 74px'
        : layout.isDesktop
          ? '14px 0 28px'
          : '8px 12px 80px',
      maxWidth: layout.isDesktop
        ? layout.desktopContainerMaxWidth
        : layout.isMobile
          ? '100%'
          : layout.containerMaxWidth,
      margin: '0 auto',
      color: CORPORATE_THEME.textPrimary,
      fontFamily: CORPORATE_THEME.fontSans,
    }),
    overviewViewportBox: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: layout.isMobile ? 4 : layout.isDesktop ? 10 : 8,
      overflowY: 'hidden',
      boxSizing: 'border-box',
      maxHeight: layout.isMobile
        ? 'calc(100dvh - 46px - 62px)'
        : layout.isDesktop
          ? 'calc(100dvh - 76px)'
          : 'none',
    }),
    desktopOverviewGrid: Object.freeze({
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
      gap: 16,
      alignItems: 'start',
    }),
    desktopInsightsColumn: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minWidth: 0,
    }),
    desktopInsightCard: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.navyPrimary}`,
      borderRadius: 6,
      padding: '10px 14px',
    }),
    desktopInsightCardBrown: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.brownPrimary}`,
      borderRadius: 6,
      padding: '10px 14px',
    }),
    topBar: Object.freeze({
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      padding: layout.isMobile ? '3px 6px' : '5px 12px',
      borderRadius: 6,
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#FFFFFF',
      borderBottom: `2px solid ${CORPORATE_THEME.brownPrimary}`,
      boxSizing: 'border-box',
      minHeight: layout.isMobile ? 36 : 40,
      marginBottom: 0,
    }),
    monthNavEmbeddedButton: Object.freeze({
      minWidth: layout.isMobile ? 32 : 36,
      minHeight: layout.isMobile ? 32 : 36,
      width: layout.isMobile ? 32 : 36,
      height: layout.isMobile ? 32 : 36,
      padding: 0,
      borderRadius: 4,
      border: 'none',
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      color: '#FFFFFF',
      fontSize: layout.isMobile ? 16 : 18,
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'background-color 150ms ease',
    }),
    tabsBar: Object.freeze({
      position: layout.isDesktop ? 'static' : 'fixed',
      bottom: layout.isDesktop ? 'auto' : 0,
      left: 0,
      right: 0,
      zIndex: 40,
      display: 'grid',
      gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
      gap: layout.isMobile ? 4 : 8,
      padding: layout.isMobile ? '6px 6px 6px' : '8px 20px 8px',
      width: '100%',
      maxWidth: layout.isDesktop
        ? '100%'
        : layout.isMobile
          ? '100%'
          : layout.containerMaxWidth,
      margin: layout.isDesktop ? '0 0 12px 0' : '0 auto',
      boxSizing: 'border-box',
      backgroundColor: layout.isDesktop
        ? CORPORATE_THEME.navyPrimary
        : 'rgba(242, 244, 247, 0.96)',
      borderTop: layout.isDesktop
        ? 'none'
        : `1px solid ${CORPORATE_THEME.borderStrong}`,
      borderBottom: layout.isDesktop
        ? `2px solid ${CORPORATE_THEME.brownPrimary}`
        : 'none',
      borderRadius: layout.isDesktop ? 6 : 0,
      boxShadow: layout.isDesktop
        ? '0 4px 12px rgba(11, 25, 44, 0.08)'
        : '0 -6px 20px rgba(11, 25, 44, 0.08)',
    }),
    tabButton: Object.freeze({
      minHeight: layout.isMobile ? 44 : 42,
      padding: layout.isMobile ? '4px 2px' : '6px 10px',
      borderRadius: 8,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      backgroundColor: CORPORATE_THEME.surface,
      color: CORPORATE_THEME.textSecondary,
      fontWeight: 600,
      fontSize: layout.isMobile ? 10.5 : 12,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      cursor: 'pointer',
      transform: 'translateY(0px)',
      transition:
        'transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease',
      boxShadow: '0 2px 5px rgba(11, 25, 44, 0.05)',
    }),
    activeTabButton: Object.freeze({
      minHeight: layout.isMobile ? 44 : 42,
      padding: layout.isMobile ? '4px 2px' : '6px 10px',
      borderRadius: 8,
      border: `1px solid ${CORPORATE_THEME.brownPrimary}`,
      backgroundColor: CORPORATE_THEME.brownPrimary,
      color: '#FFFFFF',
      fontWeight: 700,
      fontSize: layout.isMobile ? 10.5 : 12,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      cursor: 'pointer',
      transform: layout.isDesktop ? 'translateY(0px)' : 'translateY(-8px)',
      transition:
        'transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease',
      boxShadow: '0 8px 18px rgba(74, 53, 37, 0.28)',
    }),
    kpiGrid: Object.freeze({
      display: 'grid',
      gridTemplateColumns: layout.isMobile
        ? 'repeat(2, minmax(0, 1fr))'
        : layout.isTablet
          ? 'repeat(2, minmax(0, 1fr))'
          : 'repeat(4, minmax(0, 1fr))',
      gap: 1,
      backgroundColor: CORPORATE_THEME.border,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.navyPrimary}`,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 0,
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(11, 25, 44, 0.04)',
    }),
    kpiCardNavy: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      color: CORPORATE_THEME.textPrimary,
      padding: layout.isMobile ? '4px 8px' : '8px 12px',
    }),
    kpiCardBrown: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      color: CORPORATE_THEME.textPrimary,
      padding: layout.isMobile ? '4px 8px' : '8px 12px',
    }),
    kpiCardLight: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      color: CORPORATE_THEME.textPrimary,
      padding: layout.isMobile ? '4px 8px' : '8px 12px',
    }),
    kpiCardHighlight: Object.freeze({
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#FFFFFF',
      padding: layout.isMobile ? '4px 8px' : '8px 12px',
    }),
    grid: Object.freeze({
      display: 'grid',
      gridTemplateColumns:
        gridColumns === 1 ? '1fr' : 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
      gap: layout.isMobile ? 14 : 20,
      alignItems: 'start',
    }),
    card: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.navyPrimary}`,
      borderRadius: 6,
      padding: layout.isMobile ? 14 : 20,
    }),
    cardBrownRule: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.brownPrimary}`,
      borderRadius: 6,
      padding: layout.isMobile ? 14 : 20,
    }),
    amountInput: Object.freeze({
      minHeight: 48,
      width: '100%',
      padding: '10px 14px',
      borderRadius: 4,
      border: `2px solid ${CORPORATE_THEME.navyPrimary}`,
      boxSizing: 'border-box',
      fontSize: 18,
      fontWeight: 700,
      fontFamily: CORPORATE_THEME.fontSerif,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
      backgroundColor: '#FFFFFF',
      color: '#0B192C',
      caretColor: '#0B192C',
      colorScheme: 'light',
    }),
    input: Object.freeze({
      minHeight: 44,
      width: '100%',
      padding: '9px 12px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      boxSizing: 'border-box',
      fontSize: 14,
      backgroundColor: '#FFFFFF',
      color: CORPORATE_THEME.textPrimary,
      caretColor: '#0B192C',
      colorScheme: 'light',
    }),
    primaryButton: Object.freeze({
      minHeight: 48,
      width: '100%',
      padding: '11px 18px',
      borderRadius: 4,
      border: 'none',
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#FFFFFF',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
    }),
    brownButton: Object.freeze({
      minHeight: 48,
      width: '100%',
      padding: '11px 18px',
      borderRadius: 4,
      border: 'none',
      backgroundColor: CORPORATE_THEME.brownPrimary,
      color: '#FFFFFF',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
    }),
    agentAdviceButton: Object.freeze({
      minHeight: layout.isMobile ? 38 : 42,
      width: '100%',
      padding: layout.isMobile ? '7px 14px' : '9px 18px',
      borderRadius: 6,
      border: `1px solid ${CORPORATE_THEME.brownPrimary}`,
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#FFFFFF',
      fontWeight: 700,
      fontSize: layout.isMobile ? 13 : 14,
      fontFamily: CORPORATE_THEME.fontSans,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      cursor: 'pointer',
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(11, 25, 44, 0.14)',
    }),
    agentAdviceModalOverlay: Object.freeze({
      position: 'fixed',
      inset: 0,
      zIndex: 80,
      backgroundColor: 'rgba(11, 25, 44, 0.62)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: layout.isMobile ? 12 : 24,
      boxSizing: 'border-box',
    }),
    agentAdviceModalDialog: Object.freeze({
      width: '100%',
      maxWidth: layout.isMobile ? '100%' : 680,
      maxHeight: '88dvh',
      overflowY: 'auto',
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      borderTop: `3px solid ${CORPORATE_THEME.brownPrimary}`,
      borderRadius: 8,
      padding: layout.isMobile ? 14 : 20,
      boxSizing: 'border-box',
      boxShadow: '0 16px 40px rgba(11, 25, 44, 0.28)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }),
    agentAdviceModalHeader: Object.freeze({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 8,
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
    }),
    agentAdviceModalCloseButton: Object.freeze({
      minHeight: 36,
      padding: '6px 12px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      color: CORPORATE_THEME.textPrimary,
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
    }),
  });
}

class MonthlyOverviewController {
  constructor({
    expenseRepository,
    categoryRepository,
    incomeRepository,
    investmentRepository,
    reminderRepository,
    recurrenceRepository,
    llmClient = null,
    adviceRequestRepository = null,
    csvDelivery = null,
    isConsentAccepted = () => true,
    today = () => formatIsoDate(new Date()),
    now = () => new Date(),
    viewportWidth = 390,
  } = {}) {
    const fallbackCats = categoryRepository ?? createInMemoryCategoryRepository();
    this.llmClient = llmClient;
    this.adviceRequestRepository =
      adviceRequestRepository ?? createInMemoryAdviceRequestRepository();
    this.isConsentAccepted = isConsentAccepted;
    this.adviceService = new AdviceService({
      llmClient,
      adviceRequestRepository: this.adviceRequestRepository,
      isConsentAccepted,
      today,
      now,
    });
    this.recurrenceRepository =
      recurrenceRepository ?? createInMemoryRecurrenceRepository();
    this.categoryRepository = fallbackCats;
    this.expenseRepository =
      expenseRepository ?? createInMemoryExpenseRepository(fallbackCats);
    this.incomeRepository = incomeRepository ?? createInMemoryIncomeRepository();
    this.investmentRepository =
      investmentRepository ?? createInMemoryInvestmentRepository();
    this.reminderRepository =
      reminderRepository ?? createInMemoryReminderRepository();
    this.today = today;
    this.now = now;
    this.viewportWidth = viewportWidth;

    const initialDate = formatIsoDate(this.today());
    this.currentYearMonth = extractYearMonth(initialDate);
    this.activeYearMonth = this.currentYearMonth;
    this.activeTab = 'overview';

    this.categories = [];
    this.expenses = [];
    this.previousMonthlyTotals = [];
    this.monthlyIncome = null;
    this.incomeEntries = [];
    this.investments = [];
    this.reminders = [];
    this.recurrences = [];
    this.recurrenceError = null;
    this.advice = buildIdleAdviceState();
    this.isAdviceModalOpen = false;
    this.csvDelivery = csvDelivery ?? createBrowserCsvDelivery();
    this.exportState = buildIdleExportState();

    this.incomeInput = '';
    this.incomeDateInput = initialDate;
    this.incomeNoteInput = '';
    this.editingIncomeId = null;
    this.incomeError = null;

    this.investmentAssetInput = '';
    this.investmentPlatformInput = '';
    this.investmentAmountInput = '';
    this.investmentDateInput = initialDate;
    this.investmentDueDateInput = '';
    this.investmentNoteInput = '';
    this.investmentError = null;

    this.reminderTitleInput = '';
    this.reminderDueDateInput = initialDate;
    this.reminderError = null;

    this.initialized = false;
  }

  async initialize() {
    const defaultDate = formatIsoDate(this.today());
    this.currentYearMonth = extractYearMonth(defaultDate);
    this.activeYearMonth = this.currentYearMonth;
    this.incomeDateInput = defaultDate;
    this.investmentDateInput = defaultDate;
    this.reminderDueDateInput = defaultDate;
    await this.reloadMonthData(this.activeYearMonth);
    this.initialized = true;
    return this.getState();
  }

  async reloadMonthData(yearMonth) {
    const [cats, exps, inc, incEntries, invs, rems, prevTotals] = await Promise.all([
      this.categoryRepository.findAll(),
      this.expenseRepository.findByYearMonth(yearMonth),
      this.incomeRepository.findByYearMonth(yearMonth),
      typeof this.incomeRepository.findEntriesByYearMonth === 'function'
        ? this.incomeRepository.findEntriesByYearMonth(yearMonth)
        : Promise.resolve([]),
      this.investmentRepository.findByYearMonth(yearMonth),
      this.reminderRepository.findAll(),
      loadPreviousMonthlyTotals(this.expenseRepository, yearMonth),
    ]);
    this.categories = cats;
    this.expenses = exps;
    this.previousMonthlyTotals = prevTotals;
    this.monthlyIncome = inc;
    this.incomeEntries = incEntries;
    this.investments = invs;
    this.reminders = rems;
    this.editingIncomeId = null;
    this.incomeInput = '';
    this.incomeNoteInput = '';
    const defaultToday = formatIsoDate(this.today());
    this.incomeDateInput =
      extractYearMonth(defaultToday) === yearMonth ? defaultToday : `${yearMonth}-01`;
    await this.reloadRecurrences();
    await this.reloadRemainingModelRequests();
  }

  async reloadRemainingModelRequests() {
    let remaining = this.advice.remainingModelRequests;
    try {
      remaining = await this.adviceService.getRemainingModelRequests();
      this.advice = Object.freeze({ ...this.advice, remainingModelRequests: remaining });
    } catch {
      // Si no se puede leer el cupo se conserva el último valor mostrado.
    }
    if (
      this.advice.status === 'idle' &&
      this.activeYearMonth === this.currentYearMonth &&
      typeof this.adviceRequestRepository?.findDailyAdviceSnapshot === 'function'
    ) {
      try {
        const todayStr = formatIsoDate(this.today());
        const snapshot = await this.adviceRequestRepository.findDailyAdviceSnapshot(
          todayStr,
          this.activeYearMonth,
        );
        if (snapshot && Array.isArray(snapshot.suggestions) && snapshot.suggestions.length > 0) {
          this.advice = Object.freeze({
            status: 'ready',
            suggestions: snapshot.suggestions,
            source: snapshot.source,
            reason: snapshot.reason,
            remainingModelRequests: remaining,
          });
        }
      } catch {
        // Ignorar si no hay snapshot diario disponible.
      }
    }
  }

  openAdviceModal() {
    this.isAdviceModalOpen = true;
    return this.getState();
  }

  closeAdviceModal() {
    this.isAdviceModalOpen = false;
    return this.getState();
  }

  async requestAdvice() {
    if (this.advice.status === 'loading') {
      return this.getState();
    }
    const remainingBefore = this.advice.remainingModelRequests;
    this.advice = Object.freeze({ ...this.advice, status: 'loading' });
    this.advice = await resolveAdvice({
      adviceService: this.adviceService,
      expenseRepository: this.expenseRepository,
      incomeRepository: this.incomeRepository,
      categories: this.categories,
      yearMonth: this.activeYearMonth,
      recurrences: this.recurrences,
      remainingModelRequests: remainingBefore,
    });
    if (
      this.advice.status === 'ready' &&
      typeof this.adviceRequestRepository?.saveDailyAdviceSnapshot === 'function'
    ) {
      try {
        await this.adviceRequestRepository.saveDailyAdviceSnapshot({
          date: formatIsoDate(this.today()),
          yearMonth: this.activeYearMonth,
          suggestions: this.advice.suggestions,
          source: this.advice.source,
          reason: this.advice.reason,
        });
      } catch {
        // Ignorar errores de almacenamiento del snapshot diario.
      }
    }
    return this.getState();
  }

  async exportHistory(mode = 'download') {
    this.exportState = await exportHistory({
      expenseRepository: this.expenseRepository,
      categoryRepository: this.categoryRepository,
      today: this.today,
      delivery: this.csvDelivery,
      mode,
    });
    return this.getState();
  }

  async reloadRecurrences() {
    this.recurrences = await loadVisibleRecurrences({
      expenseRepository: this.expenseRepository,
      recurrenceRepository: this.recurrenceRepository,
      categories: this.categories,
      referenceDate: formatIsoDate(this.today()),
    });
  }

  async dismissRecurrence(recurrenceKey) {
    this.recurrenceError = null;
    try {
      await this.recurrenceRepository.dismiss(recurrenceKey);
    } catch {
      this.recurrenceError = RECURRENCE_DISMISS_ERROR_MESSAGE;
      return this.getState();
    }
    await this.reloadRecurrences();
    return this.getState();
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    return this.getState();
  }

  setIncomeInput(value) {
    this.incomeInput = value === null || value === undefined ? '' : String(value);
    this.incomeError = null;
    return this.getState();
  }

  setIncomeInputs(patch = {}) {
    if (patch.amountInput !== undefined) {
      this.incomeInput =
        patch.amountInput === null ? '' : String(patch.amountInput);
    }
    if (patch.date !== undefined) {
      this.incomeDateInput = patch.date === null ? '' : String(patch.date);
    }
    if (patch.note !== undefined) {
      this.incomeNoteInput = patch.note === null ? '' : String(patch.note);
    }
    this.incomeError = null;
    return this.getState();
  }

  startEditIncomeEntry(id) {
    const found = this.incomeEntries.find((item) => item.id === id);
    if (!found) {
      return this.getState();
    }
    this.editingIncomeId = found.id;
    this.incomeInput = formatCentsToInput(found.amountCents);
    this.incomeDateInput = found.date;
    this.incomeNoteInput = found.note ?? '';
    this.incomeError = null;
    return this.getState();
  }

  cancelEditIncomeEntry() {
    this.editingIncomeId = null;
    this.incomeInput = '';
    this.incomeNoteInput = '';
    this.incomeError = null;
    return this.getState();
  }

  async submitMonthlyIncome(rawOverride = undefined) {
    const isObjectOverride =
      rawOverride !== null && typeof rawOverride === 'object';
    const rawValue = isObjectOverride
      ? (rawOverride.amountInput ?? this.incomeInput)
      : rawOverride !== undefined
        ? rawOverride
        : this.incomeInput;
    const defaultDate = formatIsoDate(this.today());
    const fallbackDate =
      extractYearMonth(defaultDate) === this.activeYearMonth
        ? defaultDate
        : `${this.activeYearMonth}-01`;
    const resolvedDate = isObjectOverride
      ? (rawOverride.date ?? this.incomeDateInput ?? fallbackDate)
      : (this.incomeDateInput || fallbackDate);
    const resolvedNote = isObjectOverride
      ? (rawOverride.note !== undefined ? rawOverride.note : this.incomeNoteInput)
      : this.incomeNoteInput;

    this.incomeError = null;
    try {
      const amountCents = parseAmountToCents(rawValue);
      const updatedAt = formatIsoDateTime(this.now());

      if (typeof this.incomeRepository.addEntry === 'function') {
        if (
          this.editingIncomeId !== null &&
          typeof this.incomeRepository.updateEntry === 'function'
        ) {
          await this.incomeRepository.updateEntry(
            new IncomeEntry({
              id: this.editingIncomeId,
              amountCents,
              date: resolvedDate,
              note: resolvedNote || null,
            }),
          );
          this.editingIncomeId = null;
        } else {
          await this.incomeRepository.addEntry(
            new IncomeEntry({
              amountCents,
              date: resolvedDate,
              note: resolvedNote || null,
              createdAt: updatedAt,
            }),
          );
        }
        const targetYm = extractYearMonth(resolvedDate);
        if (targetYm && targetYm !== this.activeYearMonth) {
          this.activeYearMonth = targetYm;
        }
        this.monthlyIncome = await this.incomeRepository.findByYearMonth(
          this.activeYearMonth,
        );
        this.incomeEntries =
          typeof this.incomeRepository.findEntriesByYearMonth === 'function'
            ? await this.incomeRepository.findEntriesByYearMonth(this.activeYearMonth)
            : [];
        this.incomeInput = '';
        this.incomeNoteInput = '';
      } else {
        const accumulatedCents = (this.monthlyIncome?.amountCents ?? 0) + amountCents;
        const draft = new MonthlyIncome({
          yearMonth: this.activeYearMonth,
          amountCents: accumulatedCents,
          updatedAt,
        });
        this.monthlyIncome = await this.incomeRepository.save(draft);
        this.incomeInput = '';
      }
      return this.getState();
    } catch (err) {
      if (err instanceof DomainException) {
        this.incomeError = err.message;
        if (this.activeTab === 'overview') {
          this.activeTab = 'income';
        }
        return this.getState();
      }
      throw err;
    }
  }

  async deleteIncomeEntry(id) {
    this.incomeError = null;
    await this.incomeRepository.deleteEntryById(id);
    this.monthlyIncome = await this.incomeRepository.findByYearMonth(
      this.activeYearMonth,
    );
    this.incomeEntries =
      typeof this.incomeRepository.findEntriesByYearMonth === 'function'
        ? await this.incomeRepository.findEntriesByYearMonth(this.activeYearMonth)
        : [];
    if (this.editingIncomeId === id) {
      this.editingIncomeId = null;
      this.incomeInput = '';
      this.incomeNoteInput = '';
    }
    return this.getState();
  }

  setInvestmentInputs(patch = {}) {
    if (patch.assetName !== undefined) this.investmentAssetInput = patch.assetName;
    if (patch.platform !== undefined) this.investmentPlatformInput = patch.platform;
    if (patch.amountInput !== undefined) this.investmentAmountInput = patch.amountInput;
    if (patch.date !== undefined) this.investmentDateInput = patch.date;
    if (patch.dueDate !== undefined) this.investmentDueDateInput = patch.dueDate;
    if (patch.note !== undefined) this.investmentNoteInput = patch.note;
    this.investmentError = null;
    return this.getState();
  }

  async submitInvestment(overrides = {}) {
    const assetName = overrides.assetName ?? this.investmentAssetInput;
    const platform = overrides.platform ?? this.investmentPlatformInput;
    const rawAmount = overrides.amountInput ?? this.investmentAmountInput;
    const date = overrides.date ?? this.investmentDateInput;
    const dueDate = overrides.dueDate ?? this.investmentDueDateInput;
    const note = overrides.note ?? this.investmentNoteInput;

    this.investmentError = null;
    try {
      const amountCents = parseAmountToCents(rawAmount);
      const draft = new Investment({
        assetName,
        platform,
        amountCents,
        date,
        dueDate: dueDate || null,
        note: note || null,
        createdAt: formatIsoDateTime(this.now()),
      });
      await this.investmentRepository.save(draft);
      this.investments = await this.investmentRepository.findByYearMonth(
        this.activeYearMonth,
      );
      this.investmentAssetInput = '';
      this.investmentPlatformInput = '';
      this.investmentAmountInput = '';
      this.investmentDueDateInput = '';
      this.investmentNoteInput = '';
      return this.getState();
    } catch (err) {
      if (err instanceof DomainException) {
        this.investmentError = err.message;
        return this.getState();
      }
      throw err;
    }
  }

  async submitReminder({ title, dueDate } = {}) {
    const resolvedTitle = title ?? this.reminderTitleInput;
    const resolvedDue = dueDate ?? this.reminderDueDateInput;
    this.reminderError = null;
    try {
      const draft = new Reminder({
        title: resolvedTitle,
        dueDate: resolvedDue,
        createdAt: formatIsoDateTime(this.now()),
      });
      await this.reminderRepository.save(draft);
      this.reminders = await this.reminderRepository.findAll();
      this.reminderTitleInput = '';
      if (this.activeTab === 'overview') {
        this.activeTab = 'reminders';
      }
      return this.getState();
    } catch (err) {
      if (err instanceof DomainException) {
        this.reminderError = err.message;
        if (this.activeTab === 'overview') {
          this.activeTab = 'reminders';
        }
        return this.getState();
      }
      throw err;
    }
  }

  async goToPreviousMonth() {
    this.advice = buildIdleAdviceState(this.advice.remainingModelRequests);
    this.activeYearMonth = shiftYearMonth(this.activeYearMonth, -1);
    await this.reloadMonthData(this.activeYearMonth);
    return this.getState();
  }

  async goToNextMonth() {
    if (this.activeYearMonth >= this.currentYearMonth) {
      return this.getState();
    }
    const next = shiftYearMonth(this.activeYearMonth, 1);
    this.advice = buildIdleAdviceState(this.advice.remainingModelRequests);
    this.activeYearMonth = next > this.currentYearMonth ? this.currentYearMonth : next;
    await this.reloadMonthData(this.activeYearMonth);
    return this.getState();
  }

  async registerExpense(expenseDraft) {
    const saved = await this.expenseRepository.save(expenseDraft);
    await this.reloadMonthData(this.activeYearMonth);
    return { saved, state: this.getState() };
  }

  async updateExpense(expenseDraft) {
    const updated = await this.expenseRepository.update(expenseDraft);
    await this.reloadMonthData(this.activeYearMonth);
    return { updated, state: this.getState() };
  }

  async deleteExpense(expenseId) {
    await this.expenseRepository.deleteById(expenseId);
    await this.reloadMonthData(this.activeYearMonth);
    return this.getState();
  }

  getState() {
    const totalExpensesCents = this.expenses.reduce((s, e) => s + e.amountCents, 0);
    const totalInvestmentsCents = this.investments.reduce((s, i) => s + i.amountCents, 0);
    const incomeCents = this.monthlyIncome ? this.monthlyIncome.amountCents : null;
    const availableBalanceCents =
      incomeCents !== null ? incomeCents - totalExpensesCents - totalInvestmentsCents : null;
    const categoryBreakdown = calculateCategoryIncomeBreakdown(
      this.expenses,
      this.categories,
      this.monthlyIncome,
    );
    const categoryRanking = buildCategoryRanking(categoryBreakdown);
    const monthlyComparison = buildMonthlyComparison({
      activeYearMonth: this.activeYearMonth,
      currentTotalCents: totalExpensesCents,
      previousMonthlyTotals: this.previousMonthlyTotals,
    });
    const adviceList = buildAdviceItems({
      monthlyIncome: this.monthlyIncome,
      expenses: this.expenses,
      investments: this.investments,
      breakdown: categoryBreakdown,
      reminders: this.reminders,
    });

    return Object.freeze({
      initialized: this.initialized,
      activeTab: this.activeTab,
      activeYearMonth: this.activeYearMonth,
      currentYearMonth: this.currentYearMonth,
      canGoNextMonth: this.activeYearMonth < this.currentYearMonth,
      categories: [...this.categories],
      expenses: [...this.expenses],
      monthlyIncome: this.monthlyIncome,
      incomeEntries: [...this.incomeEntries],
      investments: [...this.investments],
      reminders: [...this.reminders],
      recurrences: [...this.recurrences],
      recurrenceError: this.recurrenceError,
      advice: this.advice,
      isAdviceModalOpen: this.isAdviceModalOpen,
      exportState: this.exportState,
      totalExpensesCents,
      totalInvestmentsCents,
      availableBalanceCents,
      categoryBreakdown,
      categoryRanking,
      monthlyComparison,
      previousMonthlyTotals: [...this.previousMonthlyTotals],
      adviceList,
      incomeInput: this.incomeInput,
      incomeDateInput: this.incomeDateInput,
      incomeNoteInput: this.incomeNoteInput,
      editingIncomeId: this.editingIncomeId,
      incomeError: this.incomeError,
      investmentAssetInput: this.investmentAssetInput,
      investmentPlatformInput: this.investmentPlatformInput,
      investmentAmountInput: this.investmentAmountInput,
      investmentDateInput: this.investmentDateInput,
      investmentDueDateInput: this.investmentDueDateInput,
      investmentNoteInput: this.investmentNoteInput,
      investmentError: this.investmentError,
      reminderTitleInput: this.reminderTitleInput,
      reminderDueDateInput: this.reminderDueDateInput,
      reminderError: this.reminderError,
      viewportWidth: this.viewportWidth,
    });
  }

  renderElement() {
    const state = this.getState();
    return h(MonthlyOverviewScreen, {
      expenseRepository: this.expenseRepository,
      categoryRepository: this.categoryRepository,
      incomeRepository: this.incomeRepository,
      investmentRepository: this.investmentRepository,
      reminderRepository: this.reminderRepository,
      recurrenceRepository: this.recurrenceRepository,
      llmClient: this.llmClient,
      adviceRequestRepository: this.adviceRequestRepository,
      csvDelivery: this.csvDelivery,
      isConsentAccepted: this.isConsentAccepted,
      initialAdvice: state.advice,
      initialIsAdviceModalOpen: state.isAdviceModalOpen,
      initialExportState: state.exportState,
      initialCategories: state.categories,
      initialExpenses: state.expenses,
      initialPreviousMonthlyTotals: state.previousMonthlyTotals,
      initialMonthlyIncome: state.monthlyIncome,
      initialIncomeEntries: state.incomeEntries,
      initialInvestments: state.investments,
      initialReminders: state.reminders,
      initialRecurrences: state.recurrences,
      initialRecurrenceError: state.recurrenceError,
      initialActiveYearMonth: state.activeYearMonth,
      initialActiveTab: state.activeTab,
      initialIncomeInput: state.incomeInput,
      initialIncomeDateInput: state.incomeDateInput,
      initialIncomeNoteInput: state.incomeNoteInput,
      initialEditingIncomeId: state.editingIncomeId,
      initialIncomeError: state.incomeError,
      initialInvestmentError: state.investmentError,
      today: this.today,
      now: this.now,
      viewportWidth: state.viewportWidth,
    });
  }
}

export function MonthlyOverviewScreen({
  expenseRepository = null,
  categoryRepository = null,
  incomeRepository = null,
  investmentRepository = null,
  reminderRepository = null,
  recurrenceRepository = null,
  llmClient = null,
  adviceRequestRepository = null,
  csvDelivery = null,
  isConsentAccepted = () => true,
  initialAdvice = undefined,
  initialIsAdviceModalOpen = false,
  initialExportState = undefined,
  initialCategories = undefined,
  initialExpenses = undefined,
  initialPreviousMonthlyTotals = undefined,
  initialMonthlyIncome = undefined,
  initialIncomeEntries = undefined,
  initialInvestments = undefined,
  initialReminders = undefined,
  initialRecurrences = undefined,
  initialRecurrenceError = null,
  initialActiveYearMonth = undefined,
  initialActiveTab = 'overview',
  activeTab: controlledActiveTab = undefined,
  onTabChange = null,
  hideNavigationBar = false,
  initialIncomeInput = undefined,
  initialIncomeDateInput = undefined,
  initialIncomeNoteInput = undefined,
  initialEditingIncomeId = null,
  initialIncomeError = null,
  initialInvestmentError = null,
  today = () => formatIsoDate(new Date()),
  now = () => new Date(),
  viewportWidth = 390,
} = {}) {
  const defaultToday = formatIsoDate(today());
  const currentYearMonth = extractYearMonth(defaultToday);
  const resolvedCategories =
    initialCategories !== undefined ? initialCategories : buildDefaultCategories();

  const [catRepo] = useState(
    () => categoryRepository ?? createInMemoryCategoryRepository(resolvedCategories),
  );
  const [expRepo] = useState(
    () => expenseRepository ?? createInMemoryExpenseRepository(catRepo),
  );
  const [incRepo] = useState(
    () => incomeRepository ?? createInMemoryIncomeRepository(),
  );
  const [invRepo] = useState(
    () => investmentRepository ?? createInMemoryInvestmentRepository(),
  );
  const [remRepo] = useState(
    () => reminderRepository ?? createInMemoryReminderRepository(),
  );
  const [recRepo] = useState(
    () => recurrenceRepository ?? createInMemoryRecurrenceRepository(),
  );
  const [advRepo] = useState(
    () => adviceRequestRepository ?? createInMemoryAdviceRequestRepository(),
  );
  const [adviceService] = useState(
    () =>
      new AdviceService({
        llmClient,
        adviceRequestRepository: advRepo,
        isConsentAccepted,
        today,
        now,
      }),
  );

  const [internalActiveTab, setInternalActiveTab] = useState(initialActiveTab);
  const activeTab =
    controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = (nextTab) => {
    setInternalActiveTab(nextTab);
    if (typeof onTabChange === 'function') {
      onTabChange(nextTab);
    }
  };
  const [activeYearMonth, setActiveYearMonth] = useState(
    initialActiveYearMonth && isValidYearMonth(initialActiveYearMonth)
      ? initialActiveYearMonth
      : currentYearMonth,
  );
  const [categories, setCategories] = useState(resolvedCategories);
  const [expenses, setExpenses] = useState(initialExpenses ?? []);
  const [previousMonthlyTotals, setPreviousMonthlyTotals] = useState(
    initialPreviousMonthlyTotals ?? [],
  );
  const [monthlyIncome, setMonthlyIncome] = useState(initialMonthlyIncome ?? null);
  const [incomeEntries, setIncomeEntries] = useState(initialIncomeEntries ?? []);
  const [investments, setInvestments] = useState(initialInvestments ?? []);
  const [reminders, setReminders] = useState(initialReminders ?? []);
  const [recurrences, setRecurrences] = useState(initialRecurrences ?? []);
  const [recurrenceError, setRecurrenceError] = useState(initialRecurrenceError);
  const [advice, setAdvice] = useState(() => initialAdvice ?? buildIdleAdviceState());
  const [isAdviceModalOpen, setIsAdviceModalOpen] = useState(Boolean(initialIsAdviceModalOpen));
  const [delivery] = useState(() => csvDelivery ?? createBrowserCsvDelivery());
  const [canShare] = useState(() => delivery.canShare());
  const [exportState, setExportState] = useState(
    () => initialExportState ?? buildIdleExportState(),
  );

  const [incomeInput, setIncomeInput] = useState(
    initialIncomeInput !== undefined ? initialIncomeInput : '',
  );
  const [incomeDateInput, setIncomeDateInput] = useState(
    initialIncomeDateInput !== undefined ? initialIncomeDateInput : defaultToday,
  );
  const [incomeNoteInput, setIncomeNoteInput] = useState(
    initialIncomeNoteInput !== undefined ? initialIncomeNoteInput : '',
  );
  const [editingIncomeId, setEditingIncomeId] = useState(initialEditingIncomeId);
  const [incomeError, setIncomeError] = useState(initialIncomeError);
  const [incomeSuccess, setIncomeSuccess] = useState(null);

  const [assetInput, setAssetInput] = useState('');
  const [platformInput, setPlatformInput] = useState('');
  const [invAmountInput, setInvAmountInput] = useState('');
  const [invDateInput, setInvDateInput] = useState(defaultToday);
  const [invDueDateInput, setInvDueDateInput] = useState('');
  const [invNoteInput, setInvNoteInput] = useState('');
  const [investmentError, setInvestmentError] = useState(initialInvestmentError);

  const [reminderTitleInput, setReminderTitleInput] = useState('');
  const [reminderDueDateInput, setReminderDueDateInput] = useState(defaultToday);
  const [reminderError, setReminderError] = useState(null);

  const reloadPeriod = async (targetYm) => {
    const [cats, exps, inc, incEntries, invs, rems, prevTotals] = await Promise.all([
      catRepo.findAll(),
      expRepo.findByYearMonth(targetYm),
      incRepo.findByYearMonth(targetYm),
      typeof incRepo.findEntriesByYearMonth === 'function'
        ? incRepo.findEntriesByYearMonth(targetYm)
        : Promise.resolve([]),
      invRepo.findByYearMonth(targetYm),
      remRepo.findAll(),
      loadPreviousMonthlyTotals(expRepo, targetYm),
    ]);
    setCategories(cats);
    setExpenses(exps);
    setPreviousMonthlyTotals(prevTotals);
    setMonthlyIncome(inc);
    setIncomeEntries(incEntries);
    setInvestments(invs);
    setReminders(rems);
    setEditingIncomeId(null);
    setIncomeInput('');
    setIncomeNoteInput('');
    setIncomeDateInput(
      extractYearMonth(defaultToday) === targetYm ? defaultToday : `${targetYm}-01`,
    );
    setRecurrences(
      await loadVisibleRecurrences({
        expenseRepository: expRepo,
        recurrenceRepository: recRepo,
        categories: cats,
        referenceDate: defaultToday,
      }),
    );
  };

  useEffect(() => {
    let active = true;
    if (initialRecurrences !== undefined) {
      return undefined;
    }
    loadVisibleRecurrences({
      expenseRepository: expRepo,
      recurrenceRepository: recRepo,
      categories,
      referenceDate: defaultToday,
    }).then((visible) => {
      if (active) {
        setRecurrences(visible);
      }
    });
    return () => {
      active = false;
    };
  }, [expRepo, recRepo, categories, defaultToday, initialRecurrences]);

  useEffect(() => {
    let active = true;
    if (initialAdvice !== undefined) {
      return undefined;
    }
    Promise.all([
      adviceService.getRemainingModelRequests().catch(() => MONTHLY_MODEL_REQUEST_LIMIT),
      activeYearMonth === currentYearMonth &&
      typeof advRepo?.findDailyAdviceSnapshot === 'function'
        ? advRepo.findDailyAdviceSnapshot(defaultToday, activeYearMonth).catch(() => null)
        : Promise.resolve(null),
    ]).then(([remaining, snapshot]) => {
      if (!active) return;
      if (snapshot && Array.isArray(snapshot.suggestions) && snapshot.suggestions.length > 0) {
        setAdvice(
          Object.freeze({
            status: 'ready',
            suggestions: snapshot.suggestions,
            source: snapshot.source,
            reason: snapshot.reason,
            remainingModelRequests: remaining,
          }),
        );
      } else {
        setAdvice((prev) => Object.freeze({ ...prev, remainingModelRequests: remaining }));
      }
    });
    return () => {
      active = false;
    };
  }, [adviceService, advRepo, activeYearMonth, currentYearMonth, defaultToday, initialAdvice]);

  const handleRequestAdvice = async () => {
    if (advice.status === 'loading') {
      return;
    }
    const remainingBefore = advice.remainingModelRequests;
    setAdvice((prev) => Object.freeze({ ...prev, status: 'loading' }));
    const next = await resolveAdvice({
      adviceService,
      expenseRepository: expRepo,
      incomeRepository: incRepo,
      categories,
      yearMonth: activeYearMonth,
      recurrences,
      remainingModelRequests: remainingBefore,
    });
    if (
      next.status === 'ready' &&
      typeof advRepo?.saveDailyAdviceSnapshot === 'function'
    ) {
      try {
        await advRepo.saveDailyAdviceSnapshot({
          date: defaultToday,
          yearMonth: activeYearMonth,
          suggestions: next.suggestions,
          source: next.source,
          reason: next.reason,
        });
      } catch {
        // Ignorar errores de almacenamiento del snapshot diario.
      }
    }
    setAdvice(next);
  };

  const handleExportHistory = async (mode) => {
    setExportState(
      await exportHistory({
        expenseRepository: expRepo,
        categoryRepository: catRepo,
        today,
        delivery,
        mode,
      }),
    );
  };

  const resetAdviceForPeriodChange = () => {
    setAdvice((prev) => buildIdleAdviceState(prev.remainingModelRequests));
  };

  const handleDismissRecurrence = async (recurrence) => {
    setRecurrenceError(null);
    try {
      await recRepo.dismiss(recurrence.key);
      setRecurrences(
        await loadVisibleRecurrences({
          expenseRepository: expRepo,
          recurrenceRepository: recRepo,
          categories,
          referenceDate: defaultToday,
        }),
      );
    } catch {
      setRecurrenceError(RECURRENCE_DISMISS_ERROR_MESSAGE);
    }
  };

  useEffect(() => {
    let active = true;
    if (
      initialCategories !== undefined &&
      initialExpenses !== undefined &&
      initialMonthlyIncome !== undefined &&
      initialPreviousMonthlyTotals !== undefined
    ) {
      return undefined;
    }
    Promise.all([
      catRepo.findAll(),
      expRepo.findByYearMonth(activeYearMonth),
      incRepo.findByYearMonth(activeYearMonth),
      typeof incRepo.findEntriesByYearMonth === 'function'
        ? incRepo.findEntriesByYearMonth(activeYearMonth)
        : Promise.resolve([]),
      invRepo.findByYearMonth(activeYearMonth),
      remRepo.findAll(),
      loadPreviousMonthlyTotals(expRepo, activeYearMonth),
    ]).then(([cats, exps, inc, incEntries, invs, rems, prevTotals]) => {
      if (!active) return;
      setCategories(cats);
      setExpenses(exps);
      setPreviousMonthlyTotals(prevTotals);
      setMonthlyIncome(inc);
      setIncomeEntries(incEntries);
      setInvestments(invs);
      setReminders(rems);
    });
    return () => {
      active = false;
    };
  }, [
    catRepo,
    expRepo,
    incRepo,
    invRepo,
    remRepo,
    activeYearMonth,
    initialCategories,
    initialExpenses,
    initialMonthlyIncome,
    initialPreviousMonthlyTotals,
    initialIncomeInput,
  ]);

  const styles = buildOverviewStyles(viewportWidth);
  const { layout, gridColumns } = styles;
  const layoutMode = layout.isDesktop
    ? 'desktop'
    : layout.isTablet
      ? 'tablet'
      : 'mobile';

  const totalExpensesCents = expenses.reduce((sum, item) => sum + item.amountCents, 0);
  const totalInvestmentsCents = investments.reduce(
    (sum, item) => sum + item.amountCents,
    0,
  );
  const incomeCents = monthlyIncome ? monthlyIncome.amountCents : null;
  const availableBalanceCents =
    incomeCents !== null
      ? incomeCents - totalExpensesCents - totalInvestmentsCents
      : null;

  const categoryBreakdown = calculateCategoryIncomeBreakdown(
    expenses,
    categories,
    monthlyIncome,
  );
  const categoryRanking = buildCategoryRanking(categoryBreakdown);
  const monthlyComparison = buildMonthlyComparison({
    activeYearMonth,
    currentTotalCents: totalExpensesCents,
    previousMonthlyTotals,
  });
  const adviceList = buildAdviceItems({
    monthlyIncome,
    expenses,
    investments,
    breakdown: categoryBreakdown,
    reminders,
  });

  const dueInvestmentAlerts = investments
    .filter((inv) => Boolean(inv.dueDate))
    .map((inv) => ({
      key: `inv-${inv.id}`,
      title: `Vencimiento de ${inv.assetName} (${inv.platform})`,
      subtitle: `${inv.assetName} · ${inv.platform} · Vencimiento: ${inv.dueDate}`,
      dueDate: inv.dueDate,
      amountCents: inv.amountCents,
    }));
  const combinedReminders = [
    ...dueInvestmentAlerts,
    ...reminders.map((rem) => ({
      key: `rem-${rem.id}`,
      title: rem.title,
      subtitle: `Vencimiento: ${rem.dueDate}`,
      dueDate: rem.dueDate,
      amountCents: rem.amountCents,
    })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const canGoNextMonth = activeYearMonth < currentYearMonth;

  const handlePrevMonth = async () => {
    const prev = shiftYearMonth(activeYearMonth, -1);
    resetAdviceForPeriodChange();
    setActiveYearMonth(prev);
    await reloadPeriod(prev);
  };

  const handleNextMonth = async () => {
    if (!canGoNextMonth) return;
    const next = shiftYearMonth(activeYearMonth, 1);
    const bounded = next > currentYearMonth ? currentYearMonth : next;
    resetAdviceForPeriodChange();
    setActiveYearMonth(bounded);
    await reloadPeriod(bounded);
  };

  const handleSaveIncome = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setIncomeError(null);
    setIncomeSuccess(null);
    try {
      const amountCents = parseAmountToCents(incomeInput);
      const nowIso = formatIsoDateTime(now());
      const fallbackDate =
        extractYearMonth(defaultToday) === activeYearMonth
          ? defaultToday
          : `${activeYearMonth}-01`;
      const resolvedDate = incomeDateInput || fallbackDate;

      if (typeof incRepo.addEntry === 'function') {
        if (editingIncomeId !== null && typeof incRepo.updateEntry === 'function') {
          await incRepo.updateEntry(
            new IncomeEntry({
              id: editingIncomeId,
              amountCents,
              date: resolvedDate,
              note: incomeNoteInput || null,
            }),
          );
          setEditingIncomeId(null);
          setIncomeSuccess('Ingreso actualizado correctamente.');
        } else {
          await incRepo.addEntry(
            new IncomeEntry({
              amountCents,
              date: resolvedDate,
              note: incomeNoteInput || null,
              createdAt: nowIso,
            }),
          );
          setIncomeSuccess('Ingreso registrado y sumado al total del mes.');
        }
        const targetYm = extractYearMonth(resolvedDate) || activeYearMonth;
        if (targetYm !== activeYearMonth) {
          setActiveYearMonth(targetYm);
        }
        const [updatedInc, updatedEntries] = await Promise.all([
          incRepo.findByYearMonth(targetYm),
          typeof incRepo.findEntriesByYearMonth === 'function'
            ? incRepo.findEntriesByYearMonth(targetYm)
            : Promise.resolve([]),
        ]);
        setMonthlyIncome(updatedInc);
        setIncomeEntries(updatedEntries);
        setIncomeInput('');
        setIncomeNoteInput('');
      } else {
        const accumulatedCents = (monthlyIncome?.amountCents ?? 0) + amountCents;
        const saved = await incRepo.save(
          new MonthlyIncome({
            yearMonth: activeYearMonth,
            amountCents: accumulatedCents,
            updatedAt: nowIso,
          }),
        );
        setMonthlyIncome(saved);
        setIncomeInput('');
        setIncomeSuccess('Ingreso registrado y sumado al total del mes.');
      }
    } catch (err) {
      if (err instanceof DomainException) {
        setIncomeError(err.message);
        return;
      }
      throw err;
    }
  };

  const handleStartEditIncome = (entry) => {
    setEditingIncomeId(entry.id);
    setIncomeInput(formatCentsToInput(entry.amountCents));
    setIncomeDateInput(entry.date);
    setIncomeNoteInput(entry.note ?? '');
    setIncomeError(null);
    setIncomeSuccess(null);
  };

  const handleCancelEditIncome = () => {
    setEditingIncomeId(null);
    setIncomeInput('');
    setIncomeNoteInput('');
    setIncomeError(null);
    setIncomeSuccess(null);
  };

  const handleDeleteIncomeEntry = async (id) => {
    setIncomeError(null);
    setIncomeSuccess(null);
    if (typeof incRepo.deleteEntryById !== 'function') {
      return;
    }
    await incRepo.deleteEntryById(id);
    const [updatedInc, updatedEntries] = await Promise.all([
      incRepo.findByYearMonth(activeYearMonth),
      typeof incRepo.findEntriesByYearMonth === 'function'
        ? incRepo.findEntriesByYearMonth(activeYearMonth)
        : Promise.resolve([]),
    ]);
    setMonthlyIncome(updatedInc);
    setIncomeEntries(updatedEntries);
    if (editingIncomeId === id) {
      setEditingIncomeId(null);
      setIncomeInput('');
      setIncomeNoteInput('');
    }
  };

  const handleSaveInvestment = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setInvestmentError(null);
    try {
      const amountCents = parseAmountToCents(invAmountInput);
      await invRepo.save(
        new Investment({
          assetName: assetInput,
          platform: platformInput,
          amountCents,
          date: invDateInput,
          dueDate: invDueDateInput || null,
          note: invNoteInput || null,
          createdAt: formatIsoDateTime(now()),
        }),
      );
      const updatedInvs = await invRepo.findByYearMonth(activeYearMonth);
      setInvestments(updatedInvs);
      setAssetInput('');
      setPlatformInput('');
      setInvAmountInput('');
      setInvDueDateInput('');
      setInvNoteInput('');
    } catch (err) {
      if (err instanceof DomainException) {
        setInvestmentError(err.message);
        return;
      }
      throw err;
    }
  };

  const handleSaveReminder = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setReminderError(null);
    try {
      await remRepo.save(
        new Reminder({
          title: reminderTitleInput,
          dueDate: reminderDueDateInput,
          createdAt: formatIsoDateTime(now()),
        }),
      );
      const updatedRems = await remRepo.findAll();
      setReminders(updatedRems);
      setReminderTitleInput('');
    } catch (err) {
      if (err instanceof DomainException) {
        setReminderError(err.message);
        return;
      }
      throw err;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'expenses', label: 'Gastos' },
    { id: 'income', label: 'Ingresos' },
    { id: 'investments', label: 'Inversiones' },
    { id: 'reminders', label: 'Alertas' },
  ];

  const expensesSharePct =
    incomeCents && incomeCents > 0
      ? Math.min(100, Math.round((totalExpensesCents * 100) / incomeCents))
      : 0;
  const investmentsSharePct =
    incomeCents && incomeCents > 0
      ? Math.min(
          100 - expensesSharePct,
          Math.round((totalInvestmentsCents * 100) / incomeCents),
        )
      : 0;
  const liquiditySharePct =
    incomeCents && incomeCents > 0
      ? Math.max(0, 100 - expensesSharePct - investmentsSharePct)
      : 0;

  const periodHeaderNode = h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: layout.isMobile ? 2 : 4,
        width: '100%',
        margin: '0 auto',
        flexShrink: 0,
      },
    },
    h(
      'h2',
      {
        style: {
          margin: 0,
          fontSize: layout.isMobile ? 12.5 : 15,
          fontWeight: 700,
          color: CORPORATE_THEME.navyPrimary,
          fontFamily: CORPORATE_THEME.fontSerif,
          letterSpacing: '0.02em',
          textAlign: 'center',
          textTransform: 'uppercase',
        },
      },
      'Gestión de Estado Patrimonial',
    ),
    h(
      'div',
      {
        'data-testid': 'overview-period-header',
        style: styles.topBar,
      },
      h(
        'button',
        {
          type: 'button',
          'data-testid': 'overview-prev-month-button',
          tabIndex: 0,
          'aria-label': 'Mes anterior',
          style: styles.monthNavEmbeddedButton,
          onClick: handlePrevMonth,
        },
        h(
          'svg',
          {
            width: layout.isMobile ? 18 : 20,
            height: layout.isMobile ? 18 : 20,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true',
          },
          h('polyline', { points: '15 18 9 12 15 6' }),
        ),
      ),
      h(
        'span',
        {
          style: {
            fontSize: layout.isMobile ? 14 : 16,
            fontWeight: 600,
            fontFamily: CORPORATE_THEME.fontSerif,
            color: '#FFFFFF',
            textAlign: 'center',
            letterSpacing: '0.01em',
            flex: 1,
          },
        },
        formatYearMonthLabel(activeYearMonth),
      ),
      h(
        'button',
        {
          type: 'button',
          'data-testid': 'overview-next-month-button',
          tabIndex: 0,
          disabled: !canGoNextMonth,
          'aria-label': 'Mes siguiente',
          style: {
            ...styles.monthNavEmbeddedButton,
            opacity: canGoNextMonth ? 1 : 0.35,
            cursor: canGoNextMonth ? 'pointer' : 'not-allowed',
          },
          onClick: handleNextMonth,
        },
        h(
          'svg',
          {
            width: layout.isMobile ? 18 : 20,
            height: layout.isMobile ? 18 : 20,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true',
          },
          h('polyline', { points: '9 18 15 12 9 6' }),
        ),
      ),
    ),
  );

  let activeTabContent = null;

  if (activeTab === 'overview') {
    const chartNode = h(CategoryDistributionChart, {
      categoryBreakdown,
      totalExpensesCents,
      viewportWidth,
      compact: true,
      onNavigateToExpenses: () => setActiveTab('expenses'),
    });

    const allocationStripNode =
      incomeCents !== null && incomeCents > 0
        ? h(
            'div',
            {
              'data-testid': 'capital-allocation-strip',
              style: {
                backgroundColor: CORPORATE_THEME.surface,
                border: `1px solid ${CORPORATE_THEME.border}`,
                borderRadius: 6,
                padding: layout.isMobile ? '4px 8px' : '6px 12px',
                flexShrink: 0,
              },
            },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 4,
                  fontSize: layout.isMobile ? 10.5 : 11.5,
                  color: CORPORATE_THEME.textSecondary,
                  marginBottom: 3,
                  fontVariantNumeric: CORPORATE_THEME.tabularNums,
                },
              },
              h(
                'span',
                null,
                `Asignación del ingreso: Gastos ${expensesSharePct}% · Inversiones ${investmentsSharePct}% · Liquidez ${liquiditySharePct}%`,
              ),
              h('span', { style: { fontWeight: 600 } }, formatCentsToArs(incomeCents)),
            ),
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  height: layout.isMobile ? 4 : 6,
                  borderRadius: 2,
                  overflow: 'hidden',
                  backgroundColor: CORPORATE_THEME.surfaceMuted,
                  border: `1px solid ${CORPORATE_THEME.border}`,
                },
              },
              h('div', {
                style: {
                  width: `${expensesSharePct}%`,
                  backgroundColor: CORPORATE_THEME.navyPrimary,
                },
              }),
              h('div', {
                style: {
                  width: `${investmentsSharePct}%`,
                  backgroundColor: CORPORATE_THEME.brownPrimary,
                },
              }),
              h('div', {
                style: {
                  width: `${liquiditySharePct}%`,
                  backgroundColor: '#94A3B8',
                },
              }),
            ),
          )
        : null;

    const currentMonthComparison = monthlyComparison?.months?.[0] ?? null;
    const variationLabel =
      currentMonthComparison && currentMonthComparison.variationTenths !== null
        ? `${formatVariationTenths(currentMonthComparison.variationTenths)} vs. mes anterior`
        : 'Sin mes previo para comparar';
    const topCategoryItem = categoryBreakdown[0] ?? null;
    const recentExpenses = expenses.slice(0, 3);
    const alertItems = [
      ...combinedReminders.map((rem) => ({
        key: rem.key,
        label: rem.title,
        detail: rem.dueDate,
      })),
      ...recurrences.map((rec) => ({
        key: rec.key,
        label: `Recurrente: ${rec.categoryName}`,
        detail: formatCentsToArs(rec.typicalAmountCents),
      })),
    ].slice(0, 3);

    const desktopInsightsNode = layout.isDesktop
      ? h(
          'div',
          {
            'data-testid': 'desktop-overview-insights',
            style: styles.desktopInsightsColumn,
          },
          h(
            'section',
            {
              'data-testid': 'desktop-insight-pulse',
              style: styles.desktopInsightCard,
            },
            h(
              'h3',
              {
                style: {
                  margin: '0 0 6px 0',
                  fontSize: 14,
                  fontFamily: CORPORATE_THEME.fontSerif,
                  fontWeight: 600,
                  color: CORPORATE_THEME.navyPrimary,
                },
              },
              'Pulso mensual y liquidez',
            ),
            h(
              'div',
              {
                style: {
                  display: 'grid',
                  gap: 4,
                  fontSize: 12.5,
                  color: CORPORATE_THEME.textSecondary,
                  fontVariantNumeric: CORPORATE_THEME.tabularNums,
                },
              },
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
                h('span', null, 'Variación mensual de gastos:'),
                h('strong', { style: { color: CORPORATE_THEME.navyPrimary } }, variationLabel),
              ),
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
                h('span', null, 'Margen de liquidez del mes:'),
                h(
                  'strong',
                  { style: { color: CORPORATE_THEME.brownPrimary } },
                  incomeCents !== null && incomeCents > 0
                    ? `${liquiditySharePct} % disponible`
                    : 'Sin ingreso registrado',
                ),
              ),
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
                h('span', null, 'Principal rubro del mes:'),
                h(
                  'strong',
                  { style: { color: CORPORATE_THEME.textPrimary } },
                  topCategoryItem
                    ? `${topCategoryItem.categoryName} (${formatCentsToArs(topCategoryItem.amountCents)})`
                    : 'Sin gastos en el período',
                ),
              ),
            ),
          ),
          h(
            'section',
            {
              'data-testid': 'desktop-insight-recent',
              style: styles.desktopInsightCardBrown,
            },
            h(
              'h3',
              {
                style: {
                  margin: '0 0 6px 0',
                  fontSize: 14,
                  fontFamily: CORPORATE_THEME.fontSerif,
                  fontWeight: 600,
                  color: CORPORATE_THEME.brownPrimary,
                },
              },
              'Últimos movimientos del mes',
            ),
            recentExpenses.length === 0
              ? h(
                  'p',
                  {
                    style: {
                      margin: 0,
                      fontSize: 12.5,
                      color: CORPORATE_THEME.textMuted,
                    },
                  },
                  'Sin movimientos registrados en este período.',
                )
              : h(
                  'ul',
                  { style: { listStyle: 'none', margin: 0, padding: 0 } },
                  ...recentExpenses.map((exp) =>
                    h(
                      'li',
                      {
                        key: exp.id,
                        style: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '3px 0',
                          borderBottom: `1px solid ${CORPORATE_THEME.border}`,
                          fontSize: 12.5,
                          fontVariantNumeric: CORPORATE_THEME.tabularNums,
                        },
                      },
                      h(
                        'span',
                        { style: { color: CORPORATE_THEME.textSecondary } },
                        `${exp.date} · ${exp.categoryName ?? 'Gasto'}`,
                      ),
                      h(
                        'strong',
                        { style: { color: CORPORATE_THEME.navyPrimary } },
                        formatCentsToArs(exp.amountCents),
                      ),
                    ),
                  ),
                ),
          ),
          h(
            'section',
            {
              'data-testid': 'desktop-insight-alerts',
              style: styles.desktopInsightCard,
            },
            h(
              'h3',
              {
                style: {
                  margin: '0 0 6px 0',
                  fontSize: 14,
                  fontFamily: CORPORATE_THEME.fontSerif,
                  fontWeight: 600,
                  color: CORPORATE_THEME.navyPrimary,
                },
              },
              'Radar de vencimientos y recurrencias',
            ),
            alertItems.length === 0
              ? h(
                  'p',
                  {
                    style: {
                      margin: 0,
                      fontSize: 12.5,
                      color: CORPORATE_THEME.textMuted,
                    },
                  },
                  'Sin vencimientos próximos ni recurrencias activas.',
                )
              : h(
                  'ul',
                  { style: { listStyle: 'none', margin: 0, padding: 0 } },
                  ...alertItems.map((item) =>
                    h(
                      'li',
                      {
                        key: item.key,
                        style: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '3px 0',
                          borderBottom: `1px solid ${CORPORATE_THEME.border}`,
                          fontSize: 12.5,
                          fontVariantNumeric: CORPORATE_THEME.tabularNums,
                        },
                      },
                      h('span', { style: { color: CORPORATE_THEME.textSecondary } }, item.label),
                      h(
                        'strong',
                        { style: { color: CORPORATE_THEME.brownPrimary } },
                        item.detail,
                      ),
                    ),
                  ),
                ),
          ),
        )
      : null;

    activeTabContent = h(
      'div',
      {
        'data-testid': 'overview-viewport-box',
        style: styles.overviewViewportBox,
      },
      periodHeaderNode,
      h(
        'div',
        {
          'data-testid': 'overview-kpi-grid',
          style: styles.kpiGrid,
        },
        h(
          'div',
          { style: styles.kpiCardNavy },
          h(
            'span',
            {
              style: {
                fontSize: layout.isMobile ? 10 : 11,
                color: CORPORATE_THEME.textMuted,
                fontWeight: 600,
                display: 'block',
              },
            },
            'Ingreso mensual',
          ),
          h(
            'strong',
            {
              'data-testid': 'overview-income-amount',
              style: {
                fontSize: layout.isMobile ? 15 : 19,
                fontWeight: 600,
                fontFamily: CORPORATE_THEME.fontSerif,
                fontVariantNumeric: CORPORATE_THEME.tabularNums,
                color: CORPORATE_THEME.navyPrimary,
                display: 'block',
                marginTop: 1,
              },
            },
            incomeCents !== null
              ? formatCentsToArs(incomeCents)
              : 'Sin ingreso registrado',
          ),
        ),
        h(
          'div',
          { style: styles.kpiCardLight },
          h(
            'span',
            {
              style: {
                fontSize: layout.isMobile ? 10 : 11,
                color: CORPORATE_THEME.textMuted,
                fontWeight: 600,
                display: 'block',
              },
            },
            'Gastos del mes',
          ),
          h(
            'strong',
            {
              'data-testid': 'overview-expenses-amount',
              style: {
                fontSize: layout.isMobile ? 15 : 19,
                fontWeight: 600,
                fontFamily: CORPORATE_THEME.fontSerif,
                fontVariantNumeric: CORPORATE_THEME.tabularNums,
                display: 'block',
                marginTop: 1,
                color: CORPORATE_THEME.textPrimary,
              },
            },
            formatCentsToArs(totalExpensesCents),
          ),
        ),
        h(
          'div',
          { style: styles.kpiCardBrown },
          h(
            'span',
            {
              style: {
                fontSize: layout.isMobile ? 10 : 11,
                color: CORPORATE_THEME.brownPrimary,
                fontWeight: 600,
                display: 'block',
              },
            },
            'Inversiones (mes)',
          ),
          h(
            'strong',
            {
              'data-testid': 'overview-investments-amount',
              style: {
                fontSize: layout.isMobile ? 15 : 19,
                fontWeight: 600,
                fontFamily: CORPORATE_THEME.fontSerif,
                fontVariantNumeric: CORPORATE_THEME.tabularNums,
                color: CORPORATE_THEME.brownPrimary,
                display: 'block',
                marginTop: 1,
              },
            },
            formatCentsToArs(totalInvestmentsCents),
          ),
        ),
        h(
          'div',
          { style: styles.kpiCardHighlight },
          h(
            'span',
            {
              style: {
                fontSize: layout.isMobile ? 10 : 11,
                color: '#CBD5E1',
                fontWeight: 500,
                display: 'block',
              },
            },
            'Balance disponible',
          ),
          h(
            'strong',
            {
              'data-testid': 'overview-balance-amount',
              style: {
                fontSize: layout.isMobile ? 16 : 20,
                fontWeight: 600,
                fontFamily: CORPORATE_THEME.fontSerif,
                fontVariantNumeric: CORPORATE_THEME.tabularNums,
                display: 'block',
                marginTop: 1,
                color:
                  availableBalanceCents !== null && availableBalanceCents < 0
                    ? '#FCA5A5'
                    : '#FFFFFF',
              },
            },
            availableBalanceCents !== null
              ? formatCentsToArs(Math.max(0, availableBalanceCents))
              : 'Cargá tu ingreso',
          ),
        ),
      ),
      layout.isDesktop
        ? h(
            'div',
            {
              'data-testid': 'desktop-overview-grid',
              style: styles.desktopOverviewGrid,
            },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minWidth: 0,
                },
              },
              chartNode,
              allocationStripNode,
            ),
            desktopInsightsNode,
          )
        : h(React.Fragment, null, chartNode, allocationStripNode),
      h(
        'button',
        {
          type: 'button',
          'data-testid': 'open-agent-advice-modal-button',
          tabIndex: 0,
          style: styles.agentAdviceButton,
          onClick: () => setIsAdviceModalOpen(true),
        },
        'Consejos Agente',
      ),
      isAdviceModalOpen
        ? h(
            'div',
            {
              'data-testid': 'agent-advice-modal',
              role: 'dialog',
              'aria-modal': 'true',
              'aria-label': 'Consejos Agente',
              style: styles.agentAdviceModalOverlay,
              onClick: (e) => {
                if (e && e.target === e.currentTarget) {
                  setIsAdviceModalOpen(false);
                }
              },
            },
            h(
              'div',
              { style: styles.agentAdviceModalDialog },
              h(
                'div',
                { style: styles.agentAdviceModalHeader },
                h(
                  'h3',
                  {
                    style: {
                      margin: 0,
                      color: CORPORATE_THEME.navyPrimary,
                      fontFamily: CORPORATE_THEME.fontSerif,
                      fontSize: layout.isMobile ? 17 : 19,
                      fontWeight: 600,
                    },
                  },
                  'Consejos Agente',
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    'data-testid': 'close-agent-advice-modal-button',
                    tabIndex: 0,
                    style: styles.agentAdviceModalCloseButton,
                    onClick: () => setIsAdviceModalOpen(false),
                  },
                  'Cerrar',
                ),
              ),
              advice.status === 'ready'
                ? h(
                    'div',
                    {
                      'data-testid': 'agent-advice-last-requested-badge',
                      style: {
                        padding: '6px 10px',
                        borderRadius: 4,
                        backgroundColor: CORPORATE_THEME.navySoft,
                        border: `1px solid ${CORPORATE_THEME.border}`,
                        color: CORPORATE_THEME.navyPrimary,
                        fontSize: 12.5,
                        fontWeight: 600,
                      },
                    },
                    'Últimos consejos solicitados hoy',
                  )
                : null,
              h(RecommendationsPanel, {
                status: advice.status,
                suggestions: advice.suggestions,
                source: advice.source,
                reason: advice.reason,
                remainingModelRequests: advice.remainingModelRequests,
                monthlyLimit: MONTHLY_MODEL_REQUEST_LIMIT,
                onRequest: handleRequestAdvice,
                viewportWidth,
              }),
            ),
          )
        : null,
    );
  } else if (activeTab === 'expenses') {
    activeTabContent = h(
      'div',
      { 'data-testid': 'tab-panel-expenses' },
      periodHeaderNode,
      h(ExpenseFormScreen, {
        expenseRepository: expRepo,
        categoryRepository: catRepo,
        initialActiveYearMonth: activeYearMonth,
        today,
        now,
        viewportWidth,
        onExpenseSaved: () => reloadPeriod(activeYearMonth),
        onExpenseDeleted: () => reloadPeriod(activeYearMonth),
        onCategoriesChanged: () => reloadPeriod(activeYearMonth),
      }),
      h(CategoryRankingList, {
        ranking: categoryRanking,
        viewportWidth,
      }),
      h(MonthlyComparisonPanel, {
        comparison: monthlyComparison,
        viewportWidth,
      }),
      h(ExportHistoryPanel, {
        exportState,
        canShare,
        onDownload: () => handleExportHistory('download'),
        onShare: () => handleExportHistory('share'),
        viewportWidth,
      }),
    );
  } else if (activeTab === 'income') {
    activeTabContent = h(
      'div',
      {
        'data-testid': 'tab-panel-income',
        style: { display: 'flex', flexDirection: 'column', gap: 14 },
      },
      periodHeaderNode,
      h(
        'div',
        { style: styles.grid },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          h(
            'form',
            {
              'data-testid': 'monthly-income-form',
              style: styles.card,
              onSubmit: handleSaveIncome,
              noValidate: true,
            },
            h(
              'h3',
              {
                style: {
                  marginTop: 0,
                  marginBottom: 8,
                  color: CORPORATE_THEME.navyPrimary,
                  fontSize: 18,
                  fontFamily: CORPORATE_THEME.fontSerif,
                  fontWeight: 600,
                },
              },
              editingIncomeId !== null
                ? `Editar ingreso (${activeYearMonth})`
                : `Registrar ingreso (${activeYearMonth})`,
            ),
            h(
              'p',
              {
                style: {
                  marginTop: 0,
                  marginBottom: 12,
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: CORPORATE_THEME.textSecondary,
                },
              },
              'Cargá cada ingreso individual del período; todos se suman automáticamente al ingreso mensual disponible.',
            ),
            h(
              'div',
              { style: { display: 'grid', gap: 10, marginBottom: 10 } },
              h('input', {
                id: 'income-amount-input',
                'data-testid': 'income-amount-input',
                type: 'text',
                inputMode: 'decimal',
                placeholder: 'Monto del ingreso (ej: 1200000)',
                value: incomeInput,
                tabIndex: 0,
                style: styles.amountInput,
                onChange: (e) => {
                  setIncomeInput(e?.target?.value ?? '');
                  if (incomeError) setIncomeError(null);
                },
              }),
              h('input', {
                id: 'income-date-input',
                'data-testid': 'income-date-input',
                type: 'date',
                value: incomeDateInput,
                tabIndex: 0,
                style: styles.input,
                onChange: (e) => {
                  setIncomeDateInput(e?.target?.value ?? defaultToday);
                  if (incomeError) setIncomeError(null);
                },
              }),
              h('input', {
                id: 'income-note-input',
                'data-testid': 'income-note-input',
                type: 'text',
                placeholder: 'Concepto o fuente opcional (ej: Sueldo, Aguinaldo, Honorarios)',
                value: incomeNoteInput,
                tabIndex: 0,
                style: styles.input,
                onChange: (e) => {
                  setIncomeNoteInput(e?.target?.value ?? '');
                  if (incomeError) setIncomeError(null);
                },
              }),
            ),
            incomeError
              ? h(
                  'p',
                  {
                    'data-testid': 'income-error',
                    role: 'alert',
                    style: {
                      margin: '0 0 10px 0',
                      padding: '8px 10px',
                      borderRadius: 4,
                      backgroundColor: CORPORATE_THEME.dangerBg,
                      color: CORPORATE_THEME.danger,
                      fontSize: 13,
                      fontWeight: 600,
                    },
                  },
                  incomeError,
                )
              : null,
            incomeSuccess
              ? h(
                  'p',
                  {
                    style: {
                      margin: '0 0 10px 0',
                      padding: '8px 10px',
                      borderRadius: 4,
                      backgroundColor: CORPORATE_THEME.successBg,
                      color: CORPORATE_THEME.success,
                      fontSize: 13,
                      fontWeight: 600,
                    },
                  },
                  incomeSuccess,
                )
              : null,
            h(
              'div',
              { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h(
                'button',
                {
                  type: 'submit',
                  'data-testid': 'income-submit-button',
                  tabIndex: 0,
                  style: styles.primaryButton,
                  onClick: handleSaveIncome,
                },
                editingIncomeId !== null ? 'Actualizar ingreso' : 'Registrar ingreso',
              ),
              editingIncomeId !== null
                ? h(
                    'button',
                    {
                      type: 'button',
                      'data-testid': 'income-cancel-edit-button',
                      tabIndex: 0,
                      style: {
                        minHeight: 42,
                        padding: '8px 14px',
                        borderRadius: 4,
                        border: `1px solid ${CORPORATE_THEME.borderStrong}`,
                        backgroundColor: CORPORATE_THEME.surface,
                        color: CORPORATE_THEME.textSecondary,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      },
                      onClick: handleCancelEditIncome,
                    },
                    'Cancelar edición',
                  )
                : null,
            ),
          ),
          h(
            'section',
            {
              'data-testid': 'income-entries-section',
              style: styles.card,
            },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                },
              },
              h(
                'h3',
                {
                  style: {
                    margin: 0,
                    color: CORPORATE_THEME.navyPrimary,
                    fontSize: 18,
                    fontFamily: CORPORATE_THEME.fontSerif,
                    fontWeight: 600,
                  },
                },
                'Ingresos registrados del mes',
              ),
              h(
                'strong',
                {
                  'data-testid': 'income-entries-total',
                  style: {
                    color: CORPORATE_THEME.navyPrimary,
                    fontVariantNumeric: CORPORATE_THEME.tabularNums,
                  },
                },
                formatCentsToArs(incomeCents ?? 0),
              ),
            ),
            incomeEntries.length === 0
              ? h(
                  'p',
                  {
                    'data-testid': 'income-entries-empty',
                    style: {
                      margin: 0,
                      fontSize: 13.5,
                      color: CORPORATE_THEME.textMuted,
                    },
                  },
                  'No hay movimientos de ingreso registrados en este período.',
                )
              : h(
                  'ul',
                  {
                    'data-testid': 'income-entries-list',
                    style: {
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                    },
                  },
                  ...incomeEntries.map((entry) =>
                    h(
                      'li',
                      {
                        key: entry.id,
                        'data-testid': `income-entry-row-${entry.id}`,
                        style: {
                          padding: '10px 0',
                          borderTop: `1px solid ${CORPORATE_THEME.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8,
                        },
                      },
                      h(
                        'div',
                        null,
                        h(
                          'strong',
                          {
                            style: {
                              display: 'block',
                              fontSize: 14,
                              color: CORPORATE_THEME.textPrimary,
                            },
                          },
                          entry.note ?? 'Ingreso registrado',
                        ),
                        h(
                          'span',
                          {
                            style: {
                              fontSize: 12,
                              color: CORPORATE_THEME.textMuted,
                              fontVariantNumeric: CORPORATE_THEME.tabularNums,
                            },
                          },
                          entry.date,
                        ),
                      ),
                      h(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          },
                        },
                        h(
                          'strong',
                          {
                            'data-testid': `income-entry-amount-${entry.id}`,
                            style: {
                              color: CORPORATE_THEME.navyPrimary,
                              fontSize: 14.5,
                              fontVariantNumeric: CORPORATE_THEME.tabularNums,
                            },
                          },
                          formatCentsToArs(entry.amountCents),
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            'data-testid': `income-entry-edit-${entry.id}`,
                            style: {
                              minHeight: 34,
                              padding: '4px 10px',
                              borderRadius: 4,
                              border: `1px solid ${CORPORATE_THEME.borderStrong}`,
                              backgroundColor: CORPORATE_THEME.surface,
                              color: CORPORATE_THEME.navyPrimary,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            },
                            onClick: () => handleStartEditIncome(entry),
                          },
                          'Editar',
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            'data-testid': `income-entry-delete-${entry.id}`,
                            style: {
                              minHeight: 34,
                              padding: '4px 10px',
                              borderRadius: 4,
                              border: `1px solid ${CORPORATE_THEME.danger}`,
                              backgroundColor: CORPORATE_THEME.dangerBg,
                              color: CORPORATE_THEME.danger,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            },
                            onClick: () => handleDeleteIncomeEntry(entry.id),
                          },
                          'Eliminar',
                        ),
                      ),
                    ),
                  ),
                ),
          ),
        ),
        h(
          'section',
          {
            'data-testid': 'income-absorption-list',
            style: styles.cardBrownRule,
          },
          h(
            'h3',
            {
              style: {
                marginTop: 0,
                marginBottom: 10,
                color: CORPORATE_THEME.brownPrimary,
                fontSize: 18,
                fontFamily: CORPORATE_THEME.fontSerif,
                fontWeight: 600,
              },
            },
            'Resumen de ingreso y absorción por categoría',
          ),
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 4,
                backgroundColor: CORPORATE_THEME.surfaceMuted,
                border: `1px solid ${CORPORATE_THEME.border}`,
                marginBottom: 12,
                fontVariantNumeric: CORPORATE_THEME.tabularNums,
              },
            },
            h('span', { style: { fontSize: 13 } }, 'Ingreso registrado:'),
            h(
              'strong',
              {
                'data-testid': 'overview-income-amount',
                style: { color: CORPORATE_THEME.navyPrimary },
              },
              incomeCents !== null
                ? formatCentsToArs(incomeCents)
                : 'Sin ingreso registrado',
            ),
          ),
          categoryBreakdown.length === 0
            ? h(
                'p',
                {
                  style: {
                    margin: 0,
                    fontSize: 13,
                    color: CORPORATE_THEME.textMuted,
                  },
                },
                'No hay gastos registrados en este período para calcular absorción sobre el ingreso.',
              )
            : h(
                'ul',
                { style: { listStyle: 'none', margin: 0, padding: 0 } },
                ...categoryBreakdown.map((item) =>
                  h(
                    'li',
                    {
                      key: item.categoryId,
                      'data-testid': `overview-category-row-${item.categoryId}`,
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: `1px solid ${CORPORATE_THEME.border}`,
                        fontVariantNumeric: CORPORATE_THEME.tabularNums,
                        fontSize: 13.5,
                      },
                    },
                    h('strong', null, item.categoryName),
                    h(
                      'span',
                      null,
                      item.incomePercentage !== null
                        ? `${formatCentsToArs(item.amountCents)} (${item.incomePercentage} % del ingreso)`
                        : formatCentsToArs(item.amountCents),
                    ),
                  ),
                ),
              ),
        ),
      ),
    );
  } else if (activeTab === 'investments') {
    activeTabContent = h(
      'div',
      {
        'data-testid': 'tab-panel-investments',
        style: { display: 'flex', flexDirection: 'column', gap: 14 },
      },
      periodHeaderNode,
      h(
        'div',
        { style: styles.grid },
        h(
          'form',
          {
            'data-testid': 'investment-registry-form',
            style: styles.cardBrownRule,
            onSubmit: handleSaveInvestment,
            noValidate: true,
          },
          h(
            'h3',
            {
              style: {
                marginTop: 0,
                marginBottom: 8,
                color: CORPORATE_THEME.brownPrimary,
                fontSize: 18,
                fontFamily: CORPORATE_THEME.fontSerif,
                fontWeight: 600,
              },
            },
            'Registrar inversión',
          ),
          h(
            'p',
            {
              style: {
                marginTop: 0,
                marginBottom: 12,
                fontSize: 13,
                lineHeight: 1.45,
                color: CORPORATE_THEME.textSecondary,
              },
            },
            'Anotá en qué activo y entidad destinaste capital y su fecha de vencimiento.',
          ),
          h(
            'div',
            { style: { display: 'grid', gap: 10, marginBottom: 12 } },
            h('input', {
              'data-testid': 'investment-asset-input',
              type: 'text',
              placeholder: 'Activo (ej: Plazo Fijo 30 días, FCI, CEDEAR)',
              value: assetInput,
              tabIndex: 0,
              style: styles.input,
              onChange: (e) => setAssetInput(e?.target?.value ?? ''),
            }),
            h('input', {
              'data-testid': 'investment-platform-input',
              type: 'text',
              placeholder: 'Entidad o plataforma (ej: Banco Nación, Balanz, IOL)',
              value: platformInput,
              tabIndex: 0,
              style: styles.input,
              onChange: (e) => setPlatformInput(e?.target?.value ?? ''),
            }),
            h('input', {
              'data-testid': 'investment-amount-input',
              type: 'text',
              inputMode: 'decimal',
              placeholder: 'Capital colocado ($)',
              value: invAmountInput,
              tabIndex: 0,
              style: styles.amountInput,
              onChange: (e) => setInvAmountInput(e?.target?.value ?? ''),
            }),
            h(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                },
              },
              h(
                'div',
                null,
                h(
                  'label',
                  {
                    style: {
                      fontSize: 12,
                      fontWeight: 600,
                      color: CORPORATE_THEME.textSecondary,
                      display: 'block',
                      marginBottom: 4,
                    },
                  },
                  'Fecha de constitución',
                ),
                h('input', {
                  'data-testid': 'investment-date-input',
                  type: 'date',
                  value: invDateInput,
                  tabIndex: 0,
                  style: styles.input,
                  onChange: (e) => setInvDateInput(e?.target?.value ?? defaultToday),
                }),
              ),
              h(
                'div',
                null,
                h(
                  'label',
                  {
                    style: {
                      fontSize: 12,
                      fontWeight: 600,
                      color: CORPORATE_THEME.textSecondary,
                      display: 'block',
                      marginBottom: 4,
                    },
                  },
                  'Vencimiento (opcional)',
                ),
                h('input', {
                  'data-testid': 'investment-due-date-input',
                  type: 'date',
                  value: invDueDateInput,
                  tabIndex: 0,
                  style: styles.input,
                  onChange: (e) => setInvDueDateInput(e?.target?.value ?? ''),
                }),
              ),
            ),
            h('input', {
              'data-testid': 'investment-note-input',
              type: 'text',
              placeholder: 'Nota de tasa o condición (ej: TNA 37%, renovación)',
              value: invNoteInput,
              tabIndex: 0,
              style: styles.input,
              onChange: (e) => setInvNoteInput(e?.target?.value ?? ''),
            }),
          ),
          investmentError
            ? h(
                'p',
                {
                  'data-testid': 'investment-error',
                  role: 'alert',
                  style: {
                    margin: '0 0 10px 0',
                    padding: '8px 10px',
                    borderRadius: 4,
                    backgroundColor: CORPORATE_THEME.dangerBg,
                    color: CORPORATE_THEME.danger,
                    fontSize: 13,
                    fontWeight: 600,
                  },
                },
                investmentError,
              )
            : null,
          h(
            'button',
            {
              type: 'submit',
              'data-testid': 'investment-submit-button',
              tabIndex: 0,
              style: styles.brownButton,
              onClick: handleSaveInvestment,
            },
            'Registrar posición',
          ),
        ),
        h(
          'section',
          {
            'data-testid': 'investment-portfolio-card',
            style: styles.card,
          },
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              },
            },
            h(
              'h3',
              {
                style: {
                  margin: 0,
                  color: CORPORATE_THEME.navyPrimary,
                  fontSize: 18,
                  fontFamily: CORPORATE_THEME.fontSerif,
                  fontWeight: 600,
                },
              },
              'Cartera registrada del período',
            ),
            h(
              'strong',
              {
                'data-testid': 'overview-investments-amount',
                style: {
                  color: CORPORATE_THEME.brownPrimary,
                  fontVariantNumeric: CORPORATE_THEME.tabularNums,
                },
              },
              formatCentsToArs(totalInvestmentsCents),
            ),
          ),
          investments.length === 0
            ? h(
                'p',
                {
                  style: {
                    margin: 0,
                    fontSize: 13.5,
                    color: CORPORATE_THEME.textMuted,
                  },
                },
                'No hay inversiones registradas en este período.',
              )
            : h(
                'ul',
                {
                  'data-testid': 'investment-list',
                  style: {
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                  },
                },
                ...investments.map((inv) =>
                  h(
                    'li',
                    {
                      key: inv.id,
                      style: {
                        padding: '11px 0',
                        borderTop: `1px solid ${CORPORATE_THEME.border}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 10,
                      },
                    },
                    h(
                      'div',
                      null,
                      h(
                        'strong',
                        {
                          style: {
                            display: 'block',
                            fontSize: 14,
                            color: CORPORATE_THEME.textPrimary,
                          },
                        },
                        `${inv.assetName} · ${inv.platform}`,
                      ),
                      h(
                        'span',
                        {
                          style: {
                            fontSize: 12,
                            color: CORPORATE_THEME.textMuted,
                            fontVariantNumeric: CORPORATE_THEME.tabularNums,
                          },
                        },
                        inv.dueDate
                          ? `Alta: ${inv.date} · Vence: ${inv.dueDate}`
                          : `Alta: ${inv.date}`,
                      ),
                      inv.note
                        ? h(
                            'span',
                            {
                              style: {
                                display: 'block',
                                fontSize: 12,
                                color: CORPORATE_THEME.textSecondary,
                                marginTop: 2,
                              },
                            },
                            inv.note,
                          )
                        : null,
                    ),
                    h(
                      'strong',
                      {
                        style: {
                          color: CORPORATE_THEME.brownPrimary,
                          fontSize: 15,
                          fontVariantNumeric: CORPORATE_THEME.tabularNums,
                        },
                      },
                      formatCentsToArs(inv.amountCents),
                    ),
                  ),
                ),
              ),
        ),
      ),
    );
  } else if (activeTab === 'reminders') {
    activeTabContent = h(
      'div',
      {
        'data-testid': 'tab-panel-reminders',
        style: { display: 'flex', flexDirection: 'column', gap: 14 },
      },
      periodHeaderNode,
      h(
        'div',
        { style: styles.grid },
        h(
          'section',
          {
            'data-testid': 'reminders-section',
            style: styles.card,
          },
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 8,
                marginBottom: 10,
              },
            },
            h(
              'h3',
              {
                style: {
                  margin: 0,
                  color: CORPORATE_THEME.navyPrimary,
                  fontSize: 18,
                  fontFamily: CORPORATE_THEME.fontSerif,
                  fontWeight: 600,
                },
              },
              'Agenda de vencimientos y recordatorios',
            ),
            h(
              'strong',
              {
                'data-testid': 'overview-investments-amount',
                style: {
                  fontSize: 13,
                  color: CORPORATE_THEME.brownPrimary,
                  fontVariantNumeric: CORPORATE_THEME.tabularNums,
                },
              },
              formatCentsToArs(totalInvestmentsCents),
            ),
          ),
          h(
            'form',
            {
              'data-testid': 'reminder-form',
              onSubmit: handleSaveReminder,
              style: { display: 'grid', gap: 8, marginBottom: 14 },
              noValidate: true,
            },
            h('input', {
              'data-testid': 'reminder-title-input',
              type: 'text',
              placeholder: 'Concepto (ej: Vencimiento Plazo Fijo / Pago resumen)',
              value: reminderTitleInput,
              tabIndex: 0,
              style: styles.input,
              onChange: (e) => setReminderTitleInput(e?.target?.value ?? ''),
            }),
            h('input', {
              'data-testid': 'reminder-due-date-input',
              type: 'date',
              value: reminderDueDateInput,
              tabIndex: 0,
              style: styles.input,
              onChange: (e) =>
                setReminderDueDateInput(e?.target?.value ?? defaultToday),
            }),
            reminderError
              ? h(
                  'p',
                  {
                    role: 'alert',
                    style: {
                      margin: 0,
                      color: CORPORATE_THEME.danger,
                      fontSize: 13,
                    },
                  },
                  reminderError,
                )
              : null,
            h(
              'button',
              {
                type: 'submit',
                'data-testid': 'reminder-submit-button',
                tabIndex: 0,
                style: styles.primaryButton,
                onClick: handleSaveReminder,
              },
              'Agendar vencimiento',
            ),
          ),
          combinedReminders.length === 0
            ? h(
                'p',
                {
                  style: {
                    margin: 0,
                    color: CORPORATE_THEME.textMuted,
                    fontSize: 13.5,
                  },
                },
                'No hay vencimientos ni recordatorios agendados.',
              )
            : h(
                'ul',
                {
                  'data-testid': 'reminders-list',
                  style: { listStyle: 'none', margin: 0, padding: 0 },
                },
                ...combinedReminders.map((rem) =>
                  h(
                    'li',
                    {
                      key: rem.key,
                      style: {
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 4,
                        backgroundColor: CORPORATE_THEME.surfaceMuted,
                        border: `1px solid ${CORPORATE_THEME.border}`,
                        borderLeft: `3px solid ${CORPORATE_THEME.brownPrimary}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      },
                    },
                    h(
                      'div',
                      null,
                      h(
                        'strong',
                        {
                          style: {
                            display: 'block',
                            fontSize: 13.5,
                            color: CORPORATE_THEME.textPrimary,
                          },
                        },
                        rem.title,
                      ),
                      h(
                        'span',
                        {
                          style: {
                            fontSize: 12,
                            color: CORPORATE_THEME.textSecondary,
                            fontVariantNumeric: CORPORATE_THEME.tabularNums,
                          },
                        },
                        rem.subtitle,
                      ),
                    ),
                    rem.amountCents
                      ? h(
                          'strong',
                          {
                            style: {
                              color: CORPORATE_THEME.navyPrimary,
                              fontVariantNumeric: CORPORATE_THEME.tabularNums,
                              fontSize: 14,
                            },
                          },
                          formatCentsToArs(rem.amountCents),
                        )
                      : null,
                  ),
                ),
              ),
        ),
        h(
          'section',
          {
            'data-testid': 'monthly-advice-section',
            style: {
              ...styles.cardBrownRule,
              backgroundColor: CORPORATE_THEME.surfaceMuted,
            },
          },
          h(
            'h3',
            {
              style: {
                marginTop: 0,
                marginBottom: 10,
                color: CORPORATE_THEME.brownPrimary,
                fontSize: 18,
                fontFamily: CORPORATE_THEME.fontSerif,
                fontWeight: 600,
              },
            },
            'Diagnóstico y notas de gestión',
          ),
          h(
            'ul',
            { style: { margin: '0 0 10px 0', paddingLeft: 18 } },
            ...adviceList.map((advice, idx) =>
              h(
                'li',
                {
                  key: idx,
                  style: {
                    marginBottom: 8,
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    color: CORPORATE_THEME.textPrimary,
                  },
                },
                advice,
              ),
            ),
          ),
          h(
            'small',
            {
              'data-testid': 'advice-disclaimer',
              style: {
                display: 'block',
                paddingTop: 8,
                borderTop: `1px solid ${CORPORATE_THEME.border}`,
                fontSize: 12,
                color: CORPORATE_THEME.textMuted,
              },
            },
            'Nota: Las sugerencias tienen carácter exclusivamente orientativo y de control de gestión personal.',
          ),
        ),
      ),
      h(RecurrencesPanel, {
        recurrences,
        onDismiss: handleDismissRecurrence,
        errorMessage: recurrenceError,
        viewportWidth,
      }),
    );
  }

  const tabsNavNode = hideNavigationBar
    ? null
    : h(
        'nav',
        {
          'data-testid': 'overview-tabs',
          'data-nav-placement': layout.isDesktop ? 'top' : 'bottom',
          'aria-label': 'Secciones del panel financiero',
          style: styles.tabsBar,
        },
        ...tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return h(
            'button',
            {
              key: tab.id,
              type: 'button',
              'data-testid': `tab-${tab.id}`,
              'data-active': isActive ? 'true' : 'false',
              'aria-selected': isActive,
              tabIndex: 0,
              style: isActive ? styles.activeTabButton : styles.tabButton,
              onClick: () => setActiveTab(tab.id),
            },
            h('span', null, tab.label),
          );
        }),
      );

  return h(
    'section',
    {
      'data-testid': 'monthly-overview-screen',
      'data-layout': layoutMode,
      'data-columns': String(gridColumns),
      'data-palette': 'corporate-navy-brown',
      'data-active-tab': activeTab,
      style: styles.wrapper,
    },
    layout.isDesktop ? tabsNavNode : null,
    activeTabContent,
    layout.isDesktop ? null : tabsNavNode,
  );
}

MonthlyOverviewScreen.createController = (options) =>
  new MonthlyOverviewController(options);
MonthlyOverviewScreen.buildStyles = buildOverviewStyles;

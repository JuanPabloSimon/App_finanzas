export class DomainException extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidConsent extends DomainException {
  constructor(detail = 'Datos de consentimiento inválidos') {
    super(detail);
  }
}

export class InvalidAmount extends DomainException {
  constructor(detail = 'Ingresá un monto mayor que cero') {
    super(detail);
  }
}

export class InvalidExpenseDate extends DomainException {
  constructor(detail = 'Ingresá una fecha válida (AAAA-MM-DD)') {
    super(detail);
  }
}

export class InvalidCategory extends DomainException {
  constructor(detail = 'Seleccioná una categoría válida') {
    super(detail);
  }
}

export class DuplicateCategory extends DomainException {
  constructor(name) {
    super(`Ya existe una categoría con el nombre "${name}"`);
    this.categoryName = name;
  }
}

export class CategoryNotFound extends DomainException {
  constructor(id) {
    super(`No existe la categoría ${id}`);
    this.categoryId = id;
  }
}

export class PredefinedCategoryDeletionNotAllowed extends DomainException {
  constructor(name = '') {
    super(
      name
        ? `La categoría predefinida "${name}" no se puede eliminar`
        : 'Las categorías predefinidas no se pueden eliminar',
    );
  }
}

export class CategoryInUse extends DomainException {
  constructor(id, expenseCount = 1) {
    super(
      `La categoría tiene ${expenseCount} gasto(s) asociado(s). Reasignalos a otra categoría antes de eliminarla.`,
    );
    this.categoryId = id;
    this.expenseCount = expenseCount;
  }
}

export class ExpenseNotFound extends DomainException {
  constructor(id) {
    super(`No existe el gasto ${id}`);
    this.expenseId = id;
  }
}

export class InvalidInvestment extends DomainException {
  constructor(detail = 'Datos de inversión inválidos') {
    super(detail);
  }
}

export class InvalidReminder extends DomainException {
  constructor(detail = 'Datos de recordatorio inválidos') {
    super(detail);
  }
}

export class InvalidCredentials extends DomainException {
  constructor(detail = 'Credenciales o datos de cuenta inválidos') {
    super(detail);
  }
}

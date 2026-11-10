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

export class ExpenseNotFound extends DomainException {
  constructor(id) {
    super(`No existe el gasto ${id}`);
    this.expenseId = id;
  }
}

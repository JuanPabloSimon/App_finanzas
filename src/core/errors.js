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

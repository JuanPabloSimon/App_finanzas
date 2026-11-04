import { InvalidConsent } from '../../core/errors.js';
import { isValidIsoDateTime } from '../../core/dates.js';

export const CURRENT_POLICY_VERSION = '2026-10';

export const PRIVACY_NOTICE_CONTENT = Object.freeze({
  version: CURRENT_POLICY_VERSION,
  title: 'Aviso de privacidad y protección de datos personales (Ley 25.326)',
  purpose:
    'Finalidad del tratamiento: los datos ingresados se utilizan exclusivamente para registrar gastos e ingresos, clasificarlos por categoría, detectar gastos recurrentes y generar recomendaciones orientativas sobre tus finanzas personales. No constituyen asesoramiento financiero, legal ni impositivo profesional.',
  localStorage:
    'Almacenamiento local: toda tu información financiera se guarda únicamente en una base de datos SQLite local (gastos.db) dentro de tu propio dispositivo móvil o de escritorio, sin servidores propios ni sincronización en la nube. Evitá incluir nombres de personas al crear categorías propias.',
  thirdPartyTransfer:
    'Transferencia al proveedor del modelo de lenguaje: cuando solicitás recomendaciones al asistente, solo se envía un resumen agregado con totales por categoría, variaciones porcentuales y recurrencias. Nunca se transfieren notas, subcategorías, fechas exactas de gastos individuales ni identificadores personales o del dispositivo.',
});

export const PRIVACY_NOTICE_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'purpose',
    title: '1. Finalidad del tratamiento',
    body: PRIVACY_NOTICE_CONTENT.purpose,
  }),
  Object.freeze({
    id: 'localStorage',
    title: '2. Almacenamiento 100 % local en el dispositivo',
    body: PRIVACY_NOTICE_CONTENT.localStorage,
  }),
  Object.freeze({
    id: 'thirdPartyTransfer',
    title: '3. Transferencia al proveedor del modelo de lenguaje',
    body: PRIVACY_NOTICE_CONTENT.thirdPartyTransfer,
  }),
]);

export class Consent {
  constructor({ policyVersion, acceptedAt } = {}) {
    if (typeof policyVersion !== 'string' || policyVersion.trim().length === 0) {
      throw new InvalidConsent('La versión del aviso de privacidad es obligatoria');
    }
    if (!isValidIsoDateTime(acceptedAt)) {
      throw new InvalidConsent(
        'La fecha de aceptación debe tener formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)',
      );
    }

    this.policyVersion = policyVersion.trim();
    this.acceptedAt = acceptedAt;
    Object.freeze(this);
  }

  copyWith({ policyVersion, acceptedAt } = {}) {
    return new Consent({
      policyVersion: policyVersion !== undefined ? policyVersion : this.policyVersion,
      acceptedAt: acceptedAt !== undefined ? acceptedAt : this.acceptedAt,
    });
  }

  isEqual(other) {
    return (
      other instanceof Consent &&
      this.policyVersion === other.policyVersion &&
      this.acceptedAt === other.acceptedAt
    );
  }
}

import { InvalidCredentials } from '../../core/errors.js';

export class UserAccount {
  constructor({ id = null, fullName, username, createdAt = null }) {
    const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
    const cleanUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!cleanName) {
      throw new InvalidCredentials('Ingresá tu nombre completo');
    }
    if (cleanUsername.length < 3) {
      throw new InvalidCredentials('El usuario o correo debe tener al menos 3 caracteres');
    }

    this.id = id;
    this.fullName = cleanName;
    this.username = cleanUsername;
    this.createdAt = createdAt ?? null;
    Object.freeze(this);
  }

  copyWith({ fullName, username } = {}) {
    return new UserAccount({
      id: this.id,
      fullName: fullName !== undefined ? fullName : this.fullName,
      username: username !== undefined ? username : this.username,
      createdAt: this.createdAt,
    });
  }
}

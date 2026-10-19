/** Longitud máxima del nombre de un usuario (FR-006). */
export const USER_NAME_MAX_LENGTH = 100;

/** Códigos de error de la gestión de usuarios (contracts/users-api.openapi.yaml). */
export const USER_ERROR_CODES = {
  notFound: 'USER_NOT_FOUND',
  emailTaken: 'USER_EMAIL_TAKEN',
  firstMustBeAdmin: 'USER_FIRST_MUST_BE_ADMIN',
  lastAdmin: 'USER_LAST_ADMIN',
  selfBlock: 'USER_SELF_BLOCK',
  roleNotFound: 'USER_ROLE_NOT_FOUND',
} as const;

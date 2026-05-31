export enum UserRoleEnum {
  PARTICIPANT = 'participant',
  ORGANIZER = 'organizer',
  INDUSTRY = 'industry',
  ADMIN = 'admin',
  GUEST = 'guest',
}

export type RequestableRole = UserRoleEnum.ORGANIZER | UserRoleEnum.INDUSTRY;

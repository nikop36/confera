export enum UserRoleEnum {
  PARTICIPANT = 'participant',
  ORGANIZER = 'organizer',
  INDUSTRY = 'industry',
  ADMIN = 'admin',
}

export type RequestableRole = UserRoleEnum.ORGANIZER | UserRoleEnum.INDUSTRY;

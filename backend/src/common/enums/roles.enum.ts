export enum UserRoleEnum {
  PARTICIPANT = 'participant',
  ORGANIZER = 'organizer',
  INDUSTRY = 'industry',
  ADMIN = 'admin',
}

export enum RequestableRoleEnum {
  ORGANIZER = UserRoleEnum.ORGANIZER,
  INDUSTRY = UserRoleEnum.INDUSTRY,
}

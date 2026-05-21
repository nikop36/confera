export interface Room {
  id: string;
  name: string;
  location?: string;
  capacity: number;
  active: boolean;
  createdAt: Date;
}

export interface Speaker {
  name: string;
  bio?: string;
  userId?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  location: string;
  capacity: number;
  registeredCount: number;
  createdBy: string;
  createdAt: Date;
}

export interface EventRegistration {
  uid: string;
  registeredAt: Date;
}

export interface EventWithMeta extends Event {
  isRegistered: boolean;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  speakers: Speaker[];
  startAt: Date;
  endAt: Date;
  location: string;
  capacity: number | null;
  registeredCount: number;
  createdBy: string;
  createdAt: Date;
}

export interface SessionRegistration {
  uid: string;
  registeredAt: Date;
}

export interface SessionWithMeta extends Session {
  isRegistered: boolean;
}

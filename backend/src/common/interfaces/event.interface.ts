export interface Event {
  id: string;
  title: string;
  speakerName: string;
  speakerBio?: string;
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

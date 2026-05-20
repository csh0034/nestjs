export interface DomainEvent {
  readonly occurredAt: Date;
  readonly eventName: string;
}

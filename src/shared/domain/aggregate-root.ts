import { DomainEvent } from './domain-event';

export abstract class AggregateRoot {
  private _domainEvents?: DomainEvent[];

  protected addEvent(event: DomainEvent): void {
    if (!this._domainEvents) this._domainEvents = [];
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this._domainEvents ?? [];
    this._domainEvents = [];
    return events;
  }

  hasDomainEvents(): boolean {
    return (this._domainEvents?.length ?? 0) > 0;
  }
}

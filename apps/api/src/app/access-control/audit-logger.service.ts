import { Injectable, Logger } from '@nestjs/common';

export interface AuditEvent {
  readonly userId: string;
  readonly action: string;
  readonly resource: string;
  readonly resourceId?: string;
  readonly organizationId?: string;
  readonly allowed: boolean;
  readonly reason?: string;
  readonly timestamp: string;
}

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger(AuditLogger.name);
  private readonly events: AuditEvent[] = [];

  log(event: AuditEvent): void {
    this.events.push(event);
    this.logger.log(JSON.stringify(event));
  }

  getEvents(): ReadonlyArray<AuditEvent> {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}

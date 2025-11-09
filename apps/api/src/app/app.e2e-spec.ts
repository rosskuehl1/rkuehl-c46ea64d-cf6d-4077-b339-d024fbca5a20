import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { BootstrapService } from './bootstrap/bootstrap.service';

interface ApiTask {
  readonly id: string;
  readonly title: string;
  readonly organizationId: string;
  readonly ownerId: string;
}

interface AuditLogEntry {
  readonly action: string;
  readonly resource: string;
  readonly resourceId?: string;
  readonly organizationId?: string;
  readonly userId: string;
  readonly allowed: boolean;
}

describe('API surface', () => {
  let app: INestApplication;
  let bootstrap: BootstrapService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    bootstrap = app.get(BootstrapService);
  });

  beforeEach(() => {
    bootstrap.reseed();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists tasks according to the caller role and organization scope', async () => {
    const server = app.getHttpServer();

    const ownerTasks = await request(server)
      .get(apiPath('/tasks'))
      .set(authHeader('user@example.com'))
      .expect(200);
    const adminTasks = await request(server)
      .get(apiPath('/tasks'))
      .set(authHeader('admin@example.com'))
      .expect(200);
    const viewerTasks = await request(server)
      .get(apiPath('/tasks'))
      .set(authHeader('viewer@example.com'))
      .expect(200);

    expect(extractTaskIds(ownerTasks.body)).toEqual([
      'task-mockups',
      'task-release',
      'task-strategy',
    ]);
    expect(extractTaskIds(adminTasks.body)).toEqual([
      'task-mockups',
      'task-release',
      'task-strategy',
    ]);
    expect(extractTaskIds(viewerTasks.body)).toEqual(['task-mockups']);
  });

  it('enforces task-level authorization for viewers', async () => {
    const server = app.getHttpServer();

    await request(server)
      .get(apiPath('/tasks/task-mockups'))
      .set(authHeader('viewer@example.com'))
      .expect(200);

    await request(server)
      .get(apiPath('/tasks/task-release'))
      .set(authHeader('viewer@example.com'))
      .expect(403);
  });

  it('records audit events for task lifecycle and restricts access by permission', async () => {
    const server = app.getHttpServer();

    const createResponse = await request(server)
      .post(apiPath('/tasks'))
      .set(authHeader('admin@example.com'))
      .send({
        title: 'Ship patch release',
        description: 'Coordinate the patch release timeline.',
        organizationId: 'org-eng',
      })
      .expect(201);

    const createdTaskId: string = createResponse.body.id;
    expect(createdTaskId).toBeDefined();
    expect(createResponse.body.ownerId).toBe('user-admin');

    await request(server)
      .put(apiPath(`/tasks/${createdTaskId}`))
      .set(authHeader('admin@example.com'))
      .send({ description: 'Updated to include rollout checklist.' })
      .expect(200);

    await request(server)
      .delete(apiPath(`/tasks/${createdTaskId}`))
      .set(authHeader('user@example.com'))
      .expect(204);

    const auditResponse = await request(server)
      .get(apiPath('/audit-log'))
      .set(authHeader('admin@example.com'))
      .expect(200);

    const auditEvents = auditResponse.body as AuditLogEntry[];
    const relevantActions = new Set(
      auditEvents
        .filter((event) => event.organizationId === 'org-eng' || event.resourceId === createdTaskId)
        .map((event) => event.action)
    );

    expect(relevantActions.has('task:create')).toBe(true);
    expect(relevantActions.has('task:update')).toBe(true);
    expect(relevantActions.has('task:delete')).toBe(true);

    await request(server)
      .post(apiPath('/tasks'))
      .set(authHeader('viewer@example.com'))
      .send({
        title: 'Attempt viewer task creation',
        organizationId: 'org-design',
      })
      .expect(403);

    await request(server)
      .get(apiPath('/audit-log'))
      .set(authHeader('viewer@example.com'))
      .expect(403);
  });

  function extractTaskIds(payload: unknown): string[] {
    const tasks = Array.isArray(payload) ? (payload as ApiTask[]) : [];
    return tasks.map((task) => task.id).sort();
  }

  function authHeader(email: string): Record<string, string> {
    return {
      Authorization: `Bearer ${createToken(email)}`,
    };
  }

  function apiPath(path: string): string {
    return `/api${path}`;
  }

  function createToken(email: string): string {
    const now = Math.floor(Date.now() / 1000);
    const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = toBase64Url(
      JSON.stringify({ sub: email, iat: now, exp: now + 60 * 60 })
    );
    return `${header}.${payload}.demo-signature`;
  }

  function toBase64Url(value: string): string {
    return Buffer.from(value)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
});

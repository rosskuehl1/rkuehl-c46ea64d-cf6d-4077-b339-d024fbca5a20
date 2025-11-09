import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AccessControlService } from './access-control/access-control.service';
import { AuditLogger } from './access-control/audit-logger.service';
import { AccessControlGuard } from './access-control/access-control.guard';
import { AuditLogController } from './access-control/audit-log.controller';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { RequestUserMiddleware } from './auth/request-user.middleware';
import { DirectoryService } from './identity/directory.service';
import { TaskService } from './tasks/task.service';
import { TaskController } from './tasks/task.controller';

@Module({
  imports: [],
  controllers: [AppController, AuthController, TaskController, AuditLogController],
  providers: [
    AppService,
    AuditLogger,
    DirectoryService,
    AccessControlService,
    TaskService,
    BootstrapService,
    RequestUserMiddleware,
    {
      provide: APP_GUARD,
      useClass: AccessControlGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestUserMiddleware).forRoutes('*');
  }
}

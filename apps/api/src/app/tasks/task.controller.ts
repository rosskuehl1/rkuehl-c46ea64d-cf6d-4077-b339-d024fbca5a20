import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { RequirePermission, RequireTaskAction, RequireTaskCreation } from '../access-control/access-control.decorator';
import { Permission } from '../models/permission.model';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { TaskService } from './task.service';

interface CreateTaskDto {
  readonly title: string;
  readonly description?: string;
  readonly organizationId: string;
  readonly ownerId?: string;
}

interface UpdateTaskDto {
  readonly title?: string;
  readonly description?: string;
}

type RequestWithUser = Request & { user?: User };

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @RequirePermission(Permission.TaskRead)
  listTasks(@Req() req: RequestWithUser): ReadonlyArray<Task> {
    const user = this.getUser(req);
    return this.taskService.listVisibleTasks(user);
  }

  @Get(':taskId')
  @RequireTaskAction('read', { taskIdParam: 'taskId' })
  getTask(@Param('taskId') taskId: string): Task {
    const task = this.taskService.getTaskById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found.');
    }
    return task;
  }

  @Post()
  @RequireTaskCreation({ organizationField: 'organizationId', location: 'body' })
  createTask(@Req() req: RequestWithUser, @Body() body: CreateTaskDto): Task {
    const user = this.getUser(req);
    const id = randomUUID();
    return this.taskService.createTask(user, {
      id,
      title: body.title,
      description: body.description,
      organizationId: body.organizationId,
      ownerId: body.ownerId,
    });
  }

  @Put(':taskId')
  @RequireTaskAction('update', { taskIdParam: 'taskId' })
  updateTask(
    @Req() req: RequestWithUser,
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskDto
  ): Task {
    const user = this.getUser(req);
    return this.taskService.updateTask(user, taskId, {
      title: body.title,
      description: body.description,
    });
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireTaskAction('delete', { taskIdParam: 'taskId' })
  deleteTask(@Req() req: RequestWithUser, @Param('taskId') taskId: string): void {
    const user = this.getUser(req);
    this.taskService.deleteTask(user, taskId);
  }

  private getUser(req: RequestWithUser): User {
    if (!req.user) {
      throw new UnauthorizedException('Authenticated user not available.');
    }
    return req.user;
  }
}

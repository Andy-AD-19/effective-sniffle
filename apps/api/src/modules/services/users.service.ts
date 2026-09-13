import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { RoleName } from "../domain/prisma-enums";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(query: { search?: string } = {}) {
    return this.prisma.user.findMany({
      where: query.search
        ? {
            OR: [
              { email: { contains: query.search } },
              { fullName: { contains: query.search } }
            ]
          }
        : undefined,
      include: { department: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(actorId: string, input: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new BadRequestException("Email already exists");
    const password = input.password?.trim();
    if (!password || password.length < 8) {
      throw new BadRequestException("Password is required and must be at least 8 characters long");
    }
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        role: input.role as RoleName,
        departmentId: input.departmentId,
        passwordHash: await bcrypt.hash(password, 10)
      },
      include: { department: true }
    });
    await this.audit.record({ actorId, action: "user.create", entityType: "User", entityId: user.id, after: user });
    return user;
  }

  async update(actorId: string, id: string, input: any) {
    const before = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const data: Prisma.UserUpdateInput = {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      active: input.active,
      department: input.departmentId === undefined ? undefined : input.departmentId ? { connect: { id: input.departmentId } } : { disconnect: true }
    };
    if (input.password) {
      if (input.password.trim().length < 8) {
        throw new BadRequestException("Password must be at least 8 characters long");
      }
      data.passwordHash = await bcrypt.hash(input.password.trim(), 10);
    }
    const user = await this.prisma.user.update({ where: { id }, data, include: { department: true } });
    await this.audit.record({ actorId, action: "user.update", entityType: "User", entityId: id, before, after: user });
    return user;
  }

  async setActive(actorId: string, id: string, active: boolean) {
    if (actorId === id && !active) throw new BadRequestException("You cannot deactivate your own user account");
    const user = await this.prisma.user.update({ where: { id }, data: { active }, include: { department: true } });
    await this.audit.record({ actorId, action: active ? "user.activate" : "user.deactivate", entityType: "User", entityId: id, after: user });
    return user;
  }
}

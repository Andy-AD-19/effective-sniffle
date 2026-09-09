import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: { action?: string; entityType?: string; page?: number; pageSize?: number }) {
    const page = Number(query.page ?? 1);
    const pageSize = Math.min(Number(query.pageSize ?? 50), 100);
    return this.prisma.auditLog.findMany({
      where: { action: query.action ? { contains: query.action } : undefined, entityType: query.entityType },
      include: { actor: { select: { email: true, fullName: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  }
}

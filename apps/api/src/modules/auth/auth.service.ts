import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { rolePermissions, type RoleName } from "@fmoh/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { department: true } });
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const permissions = rolePermissions[user.role as RoleName];
    if (!permissions) throw new UnauthorizedException("Account role is not valid. Ask an administrator to update this user.");
    const payload = { sub: user.id, email: user.email, role: user.role, permissions };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        permissions
      }
    };
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { department: true } });
    const permissions = rolePermissions[user.role as RoleName];
    if (!permissions) throw new UnauthorizedException("Account role is not valid. Ask an administrator to update this user.");
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      permissions
    };
  }
}

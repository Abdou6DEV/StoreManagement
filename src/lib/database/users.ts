import { PrismaClient, User, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
  role?: UserRole;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<User, "password">;
  error?: string;
}

export const users = {
  async create(data: CreateUserData): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: data.role || "USER",
      },
    });
  },

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { username: credentials.username },
      });

      if (!user || !user.isActive) {
        return {
          success: false,
          error: "Invalid username or password",
        };
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid username or password",
        };
      }

      const { password, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      return {
        success: false,
        error: "Authentication failed",
      };
    }
  },

  async getById(id: string): Promise<Omit<User, "password"> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async getByUsername(username: string): Promise<Omit<User, "password"> | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateRole(id: string, role: UserRole): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { role },
    });
  },

  async deactivate(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async activate(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  },

  async getAll(): Promise<Omit<User, "password">[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return users.map(({ password, ...user }) => user);
  },

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  },
};

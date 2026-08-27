import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const username = (process.env.BOOTSTRAP_ADMIN_USERNAME ?? "").trim().toLowerCase();
const fullName = (process.env.BOOTSTRAP_ADMIN_NAME ?? "Quản trị viên").trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";

if (!username || !/^[a-z0-9._-]{3,64}$/.test(username)) {
  throw new Error("BOOTSTRAP_ADMIN_USERNAME không hợp lệ.");
}
if (password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD phải có ít nhất 12 ký tự.");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existing) throw new Error("Tài khoản bootstrap đã tồn tại; không ghi đè tài khoản hiện có.");

    await prisma.user.create({
      data: {
        fullName: fullName || "Quản trị viên",
        username,
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
        active: true,
        mustChangePassword: true,
      },
    });
    console.log(`Đã tạo tài khoản quản trị ${username}; bắt buộc đổi mật khẩu khi đăng nhập lần đầu.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

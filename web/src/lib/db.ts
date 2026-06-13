import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 dùng driver adapter cho kết nối trực tiếp. Ta giữ một instance dùng
// chung (singleton) để tránh tạo quá nhiều kết nối khi hot-reload lúc dev.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Thiếu biến môi trường DATABASE_URL. Xem web/.env.example");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

// Khởi tạo LƯỜI (lazy): client chỉ được tạo — và DATABASE_URL chỉ được kiểm tra —
// khi thực sự truy vấn CSDL. Nhờ vậy bước `next build` (chỉ nạp module để thu
// thập cấu hình trang) không cần kết nối CSDL, giúp build được trong Docker
// mà không phải cấp DATABASE_URL lúc build.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

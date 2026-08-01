import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

const deletionEmail = "mailto:benhviendakhoahongphuchaiphong@gmail.com?subject=Y%C3%AAu%20c%E1%BA%A7u%20x%C3%B3a%20d%E1%BB%AF%20li%E1%BB%87u%20ZenithTasks";

export const metadata: Metadata = {
  title: "Yêu cầu xóa dữ liệu — ZenithTasks",
  description: "Hướng dẫn yêu cầu xóa dữ liệu Facebook Messenger và dữ liệu chăm sóc khách hàng liên quan khỏi ZenithTasks.",
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <LegalPageShell
      eyebrow="Quyền kiểm soát dữ liệu"
      title="Yêu cầu xóa dữ liệu"
      summary="Bạn có thể yêu cầu chúng tôi xác định và xóa dữ liệu Facebook Messenger liên quan tới mình khỏi ZenithTasks theo các bước dưới đây."
      updatedAt="01/08/2026"
    >
      <section>
        <h2>1. Gửi yêu cầu</h2>
        <ol>
          <li>
            Gửi email tới <a href={deletionEmail}>benhviendakhoahongphuchaiphong@gmail.com</a> với tiêu đề “Yêu cầu xóa dữ liệu ZenithTasks”.
          </li>
          <li>Cung cấp tên hiển thị, tên Fanpage đã nhắn, Mã Facebook (nếu biết) hoặc liên kết/ảnh chụp cuộc trò chuyện để chúng tôi xác định đúng dữ liệu.</li>
          <li>Nêu rõ bạn muốn xóa toàn bộ hội thoại hay một nhóm dữ liệu cụ thể và cung cấp thông tin liên hệ để nhận kết quả.</li>
        </ol>
      </section>

      <section>
        <h2>2. Xác minh và xử lý</h2>
        <p>
          Để tránh xóa nhầm dữ liệu, chúng tôi có thể yêu cầu bạn xác minh quyền sở hữu tài khoản hoặc cuộc trò chuyện. Sau khi xác minh hợp lệ, dữ liệu trong phạm vi yêu cầu sẽ được xóa hoặc ẩn danh, trừ phần cần lưu giữ có giới hạn để đáp ứng nghĩa vụ pháp lý, an toàn hoặc giải quyết tranh chấp.
        </p>
      </section>

      <section>
        <h2>3. Gỡ quyền truy cập Facebook</h2>
        <p>
          Bạn cũng có thể quản lý quyền đã cấp cho ZenithTasks trong mục Tiện ích tích hợp cho doanh nghiệp của Facebook. Việc gỡ quyền sẽ ngăn truy cập mới từ tài khoản đó, nhưng không tự động thay thế một yêu cầu xóa dữ liệu đã được lưu trong hệ thống của chúng tôi.
        </p>
        <p>
          <a href="https://www.facebook.com/settings?tab=business_tools" rel="noreferrer">Mở cài đặt Tiện ích tích hợp cho doanh nghiệp trên Facebook</a>
        </p>
      </section>

      <section>
        <h2>4. Cần hỗ trợ?</h2>
        <p>
          Gửi yêu cầu qua <a href={deletionEmail}>email chuyên mục xóa dữ liệu</a> hoặc gọi <a href="tel:+84941567496">0941 567 496</a> để được hướng dẫn nhận diện đúng cuộc trò chuyện.
        </p>
      </section>
    </LegalPageShell>
  );
}

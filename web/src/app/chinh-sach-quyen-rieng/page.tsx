import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư — ZenithTasks",
  description: "Cách ZenithTasks tiếp nhận, sử dụng, bảo vệ và xóa dữ liệu trong hoạt động chăm sóc khách hàng.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Minh bạch dữ liệu"
      title="Chính sách quyền riêng tư"
      summary="Chính sách này giải thích cách ZenithTasks xử lý dữ liệu khi nhân viên được ủy quyền chăm sóc khách hàng qua Facebook Messenger và các kênh chính thức khác."
      updatedAt="01/08/2026"
    >
      <section>
        <h2>1. Phạm vi áp dụng</h2>
        <p>
          ZenithTasks là hệ thống vận hành nội bộ của Trung tâm Phẫu thuật Tạo hình và Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc. Chính sách này áp dụng cho dữ liệu được tiếp nhận qua các kênh chăm sóc khách hàng đã kết nối chính thức với hệ thống.
        </p>
      </section>

      <section>
        <h2>2. Dữ liệu chúng tôi tiếp nhận</h2>
        <ul>
          <li>Mã người dùng theo phạm vi Trang (PSID), tên và ảnh đại diện do Meta cung cấp theo quyền được cấp.</li>
          <li>Nội dung tin nhắn, tệp đính kèm, thời điểm gửi, trạng thái gửi/nhận và mã cuộc trò chuyện.</li>
          <li>Thông tin vận hành do nhân viên được ủy quyền bổ sung, như người phụ trách, ghi chú chăm sóc và liên kết với hồ sơ khách hàng nội bộ.</li>
        </ul>
        <p>
          Sau khi kết nối, ZenithTasks chỉ nhận các sự kiện tin nhắn mới do nền tảng gửi tới; hệ thống không tự động nhập toàn bộ lịch sử hội thoại trước đó.
        </p>
      </section>

      <section>
        <h2>3. Mục đích sử dụng</h2>
        <ul>
          <li>Hiển thị hội thoại tập trung và cho phép nhân viên trả lời khách hàng ngay trong ZenithTasks.</li>
          <li>Phân công, theo dõi tiến độ chăm sóc, duy trì tính liên tục của cuộc trò chuyện và hỗ trợ khách hàng.</li>
          <li>Bảo vệ hệ thống, kiểm tra lỗi, ngăn chặn lạm dụng và lưu dấu vết thao tác cần thiết.</li>
        </ul>
        <p>Chúng tôi không bán dữ liệu hội thoại hoặc thông tin nhận dạng của khách hàng.</p>
      </section>

      <section>
        <h2>4. Bảo vệ và chia sẻ dữ liệu</h2>
        <p>
          Quyền truy cập được giới hạn theo vai trò công việc. Thông tin xác thực của kênh được bảo vệ và không hiển thị cho người dùng thông thường. Dữ liệu chỉ được chia sẻ với nền tảng kênh, nhà cung cấp hạ tầng cần thiết để vận hành dịch vụ, hoặc cơ quan có thẩm quyền khi pháp luật yêu cầu.
        </p>
      </section>

      <section>
        <h2>5. Lưu giữ, quyền lựa chọn và xóa dữ liệu</h2>
        <p>
          Dữ liệu được lưu trong thời gian cần thiết cho mục đích chăm sóc khách hàng, vận hành, an toàn hệ thống và nghĩa vụ pháp lý áp dụng. Bạn có thể yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu liên quan bằng cách xem <a href="/xoa-du-lieu">hướng dẫn xóa dữ liệu</a> hoặc liên hệ email bên dưới.
        </p>
      </section>

      <section>
        <h2>6. Thông tin sức khỏe và trường hợp khẩn cấp</h2>
        <p>
          Messenger không phải kênh cấp cứu và nội dung trao đổi trực tuyến không thay thế việc thăm khám, chẩn đoán hoặc chỉ định của bác sĩ. Không nên gửi thông tin sức khỏe không cần thiết qua mạng xã hội. Khi có tình trạng khẩn cấp, hãy liên hệ ngay cơ sở y tế hoặc dịch vụ cấp cứu phù hợp.
        </p>
      </section>

      <section>
        <h2>7. Liên hệ</h2>
        <p>
          Mọi câu hỏi về quyền riêng tư có thể gửi tới <a href="mailto:benhviendakhoahongphuchaiphong@gmail.com">benhviendakhoahongphuchaiphong@gmail.com</a> hoặc số <a href="tel:+84941567496">0941 567 496</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}

import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng — ZenithTasks",
  description: "Điều khoản sử dụng hệ thống ZenithTasks và các kênh chăm sóc khách hàng được kết nối.",
  robots: { index: true, follow: true },
};

export default function TermsOfUsePage() {
  return (
    <LegalPageShell
      eyebrow="Điều kiện sử dụng"
      title="Điều khoản sử dụng"
      summary="Các điều khoản dưới đây điều chỉnh việc truy cập ZenithTasks và hoạt động trao đổi qua những kênh chăm sóc khách hàng được kết nối với hệ thống."
      updatedAt="01/08/2026"
    >
      <section>
        <h2>1. Chủ thể vận hành</h2>
        <p>
          ZenithTasks được vận hành phục vụ hoạt động nội bộ của Trung tâm Phẫu thuật Tạo hình và Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc. Nhân viên chỉ được truy cập trong phạm vi nhiệm vụ và quyền đã được cấp.
        </p>
      </section>

      <section>
        <h2>2. Sử dụng đúng mục đích</h2>
        <ul>
          <li>Thông tin đăng nhập là riêng cho từng người, không được chia sẻ hoặc sử dụng thay người khác.</li>
          <li>Hội thoại khách hàng chỉ được dùng cho tư vấn, hỗ trợ, chăm sóc và vận hành hợp pháp của đơn vị.</li>
          <li>Không được truy cập trái phép, trích xuất hàng loạt, phát tán dữ liệu, can thiệp hệ thống hoặc dùng nền tảng để gửi nội dung lạm dụng.</li>
        </ul>
      </section>

      <section>
        <h2>3. Kênh bên thứ ba</h2>
        <p>
          Việc gửi và nhận tin qua Facebook Messenger, Zalo OA hoặc nền tảng khác còn phụ thuộc vào API, chính sách, trạng thái xét duyệt và khả năng cung cấp dịch vụ của từng bên. Người dùng phải tuân thủ cả điều khoản của nền tảng tương ứng.
        </p>
      </section>

      <section>
        <h2>4. Giới hạn của trao đổi trực tuyến</h2>
        <p>
          Thông tin qua kênh chăm sóc khách hàng nhằm hỗ trợ giao tiếp và sắp xếp dịch vụ, không tạo thành chẩn đoán hoặc chỉ định y khoa. Tình trạng khẩn cấp cần được xử lý qua cơ sở y tế hoặc dịch vụ cấp cứu phù hợp.
        </p>
      </section>

      <section>
        <h2>5. An toàn và tạm ngừng truy cập</h2>
        <p>
          Đơn vị vận hành có thể giới hạn hoặc tạm ngừng tài khoản khi phát hiện rủi ro bảo mật, vi phạm quyền truy cập, yêu cầu của cơ quan có thẩm quyền hoặc nhu cầu bảo trì cần thiết.
        </p>
      </section>

      <section>
        <h2>6. Thay đổi và liên hệ</h2>
        <p>
          Điều khoản có thể được cập nhật để phản ánh thay đổi về chức năng, quy trình hoặc pháp luật. Câu hỏi liên quan có thể gửi tới <a href="mailto:benhviendakhoahongphuchaiphong@gmail.com">benhviendakhoahongphuchaiphong@gmail.com</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}

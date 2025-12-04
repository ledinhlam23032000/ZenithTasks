# Ứng dụng tách & dịch PDF tự động giữ nguyên bố cục

## Mục tiêu sản phẩm
- Nhận file PDF từ người dùng, tự động tách thành nhiều phần hợp lý để dịch.
- Dịch nội dung chuẩn y khoa bằng AI, rà soát và giữ nguyên bố cục (hình ảnh, bảng, cột, heading, đánh số trang).
- Ghép các bản dịch thành một file PDF hoàn chỉnh với bố cục gốc.
- Trải nghiệm một lần tải lên, hệ thống xử lý tự động; giao diện trẻ trung, dễ thao tác, hỗ trợ di động và Windows.

## Luồng người dùng
1. **Tải lên**: kéo/thả hoặc chọn file PDF; hiển thị dung lượng, số trang, và cảnh báo nếu vượt giới hạn cấu hình.
2. **Xử lý tự động**:
   - Phân tách tài liệu thành các "chunk" theo trang/mục lục, đảm bảo không cắt ngang bảng/hình.
   - OCR cho trang scan; nhận diện bố cục (bảng, ảnh, cột, heading) để tái tạo.
   - Gửi song song từng chunk cho AI dịch y khoa; hậu kiểm AI (terminology, đơn vị, cảnh báo) trước khi ghép.
   - Theo dõi tiến trình (progress bar, trạng thái từng chunk, thời gian ước tính).
3. **Xem trước & duyệt**:
   - Trình xem hai cột: bên trái bản gốc, bên phải bản dịch giữ nguyên bố cục.
   - Cho phép chấp nhận/sửa nhanh từng đoạn, tìm kiếm thuật ngữ, highlight thay đổi.
4. **Xuất bản**:
   - Ghép tự động các chunk đã duyệt thành một PDF hoàn chỉnh, tải về hoặc gửi email.
   - Lưu lịch sử bản dịch và template glossary riêng cho người dùng.

## Yêu cầu chức năng
- **Tách PDF an toàn bố cục**: heuristic theo heading, đánh số trang, tránh cắt bảng/hình (dựa bounding box).
- **Dịch y khoa**: mô hình chuyên ngành, glossary bắt buộc, kiểm tra consistency đơn vị và thuốc.
- **Giữ nguyên bố cục**: tái dựng cấu trúc (bảng, ảnh, cột, footnote) bằng thông tin vị trí/kiểu; xuất PDF với font fallback.
- **Tự động hóa**: toàn bộ pipeline từ tải lên → dịch → ghép file diễn ra tự động; người dùng chỉ cần duyệt cuối.
- **Theo dõi tiến trình**: thanh trạng thái tổng, log chi tiết từng chunk, cảnh báo lỗi/thiếu trang.
- **Thiết bị**: UI responsive (desktop, tablet, mobile); phím tắt trên desktop, thao tác chạm lớn trên mobile.

## Yêu cầu phi chức năng
- **Bảo mật**: mã hóa khi lưu/đường truyền (TLS), xóa file sau N ngày, tùy chọn on-premise.
- **Hiệu năng**: xử lý song song chunk; cache model/embeddings; giới hạn kích thước mặc định (ví dụ 200MB hoặc 1.000 trang).
- **Khả năng mở rộng**: hàng đợi công việc (message queue) và worker service cho dịch/OCR; scale ngang.
- **Khả dụng**: retry chunk lỗi, resume tác vụ; health check cho các dịch vụ nền.

## Kiến trúc gợi ý
- **Front-end**: Web (Blazor/React) với layout responsive, theme trẻ trung (gradient nhẹ, icon hiện đại). Với Windows có thể dùng WPF shell gọi webview hoặc native upload dialog.
- **Back-end**: .NET 8 API + worker (BackgroundService) xử lý hàng đợi; lưu metadata trong database (PostgreSQL/SQL Server).
- **Xử lý tài liệu**:
  - Tách trang & phân tích bố cục: `pdfium`/`pdfplumber` + module heuristic.
  - OCR: Tesseract/Cloud Vision khi phát hiện scan.
  - Dịch: gọi endpoint model y khoa; áp dụng glossary, kiểm tra thuật ngữ.
  - Ghép PDF: dùng template bố cục từ phân tích, render lại bằng `QuestPDF` hoặc `iText7`.
- **Lưu trữ**: object storage (S3-compatible) cho input/output; CSDL lưu trạng thái chunk, glossary, lịch sử.

## Thành phần chính
- **UploadService**: lưu file, tạo job, xác thực kích thước.
- **DocumentChunker**: phân trang, tìm ranh giới mục lục, phát hiện bảng/hình để cắt thông minh.
- **LayoutAnalyzer**: trích xuất bounding box, kiểu chữ, cấu trúc bảng/heading.
- **TranslationOrchestrator**: đẩy chunk vào queue, gọi AI dịch, kiểm tra thuật ngữ, hợp nhất kết quả.
- **ReviewModule**: giao diện song song gốc/dịch, gợi ý sửa, glossary inline.
- **ExportService**: dựng lại PDF với bố cục, watermark tùy chọn, ghép các chunk.

## UI/UX đề xuất
- **Màn hình chính**: khu vực tải lên lớn (drag-drop), trạng thái upload, nút "Bắt đầu dịch".
- **Bảng điều khiển tiến trình**: timeline job, % hoàn thành, số chunk còn lại, log ngắn.
- **Viewer song song**: pane trái (gốc), phải (dịch); highlight đoạn đang xem; nút chấp nhận/sửa nhanh.
- **Mobile**: navbar dưới (Upload, Tiến trình, Lịch sử); nút lớn dễ chạm; preview giản lược.
- **Theme**: màu tươi (xanh ngọc/tím pastel), icon line, font thân thiện; dark mode tùy chọn.

## API gợi ý
- `POST /documents` (upload, trả về jobId)
- `GET /jobs/{jobId}` (trạng thái tổng, tiến trình chunk)
- `GET /jobs/{jobId}/chunks` (chi tiết chunk + preview)
- `POST /jobs/{jobId}/approve` (đánh dấu phê duyệt, merge output)
- `GET /jobs/{jobId}/download` (tải PDF đã ghép)

## Kiểm thử & vận hành
- Unit test: chunking giữ nguyên bảng/hình, glossary áp dụng đúng, render lại bảng/ảnh.
- Integration: pipeline upload → dịch → ghép; retry khi chunk lỗi.
- Theo dõi: logging theo jobId, metrics số chunk/độ trễ, cảnh báo khi worker queue backlog.

## Lộ trình triển khai gợi ý
1. MVP: upload, tách trang, dịch chunk giữ nguyên text, ghép PDF đơn giản, viewer song song.
2. Bổ sung OCR & bảo toàn bảng/ảnh, glossary y khoa bắt buộc.
3. Tối ưu hiệu năng, mobile UX, dark mode, cấu hình on-premise.

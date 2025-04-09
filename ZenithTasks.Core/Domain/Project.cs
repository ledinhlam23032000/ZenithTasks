using System; // Cần có để sử dụng DateTime

namespace ZenithTasks.Core.Domain
{
    public class Project
    {
        public int ProjectId { get; set; }
        public string ProjectName { get; set; }
        public string Owner { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Resources { get; set; } // Có thể chứa nhiều link/path, phân cách bởi dấu ;
        public string Status { get; set; } // Ví dụ: "Đang triển khai", "Đã hoàn thiện"

        // Constructor (hàm khởi tạo) có thể thêm sau nếu cần
        public Project()
        {
            ProjectName = string.Empty; // Khởi tạo giá trị mặc định để tránh null
            Owner = string.Empty;
            Resources = string.Empty;
            Status = string.Empty;
            StartDate = DateTime.Now; // Mặc định ngày bắt đầu là hôm nay
            EndDate = DateTime.Now.AddDays(7); // Mặc định ngày kết thúc sau 7 ngày
        }
    }
}

using System.Windows.Controls; // Cần cho UserControl

namespace PersonalProjectManager.Views // Đảm bảo namespace này đúng với cấu trúc project của bạn
{
    /// <summary>
    /// Lớp code-behind cho CompletedProjectListView.xaml.
    /// Hiện tại chỉ chứa hàm khởi tạo mặc định.
    /// </summary>
    public partial class CompletedProjectListView : UserControl
    {
        /// <summary>
        /// Hàm khởi tạo mặc định, gọi InitializeComponent để tải XAML.
        /// </summary>
        public CompletedProjectListView()
        {
            InitializeComponent(); // Phương thức này được tạo tự động bởi WPF
        }
    }
}

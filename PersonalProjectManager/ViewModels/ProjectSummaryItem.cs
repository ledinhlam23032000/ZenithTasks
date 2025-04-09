#nullable enable
namespace PersonalProjectManager.ViewModels
{
    /// <summary>
    /// Lớp ViewModel đơn giản để giữ thông tin tóm tắt của một dự án,
    /// thường dùng để hiển thị trên các Dashboard hoặc danh sách tổng quan.
    /// Kế thừa ViewModelBase để hỗ trợ INotifyPropertyChanged nếu cần cập nhật động sau này.
    /// </summary>
    public class ProjectSummaryItem : ViewModelBase
    {
        private string _projectName = string.Empty;
        private double _overallProgress;
        private int _projectId; // Giữ ID để có thể điều hướng hoặc thực hiện hành động

        public int ProjectId
        {
            get => _projectId;
            set => SetProperty(ref _projectId, value); // Dùng SetProperty phòng trường hợp cần cập nhật
        }

        public string ProjectName
        {
            get => _projectName;
            set => SetProperty(ref _projectName, value);
        }

        public double OverallProgress
        {
            get => _overallProgress;
            set => SetProperty(ref _overallProgress, value);
        }
    }
}
#nullable restore

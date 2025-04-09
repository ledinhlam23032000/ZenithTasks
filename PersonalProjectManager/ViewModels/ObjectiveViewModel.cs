#nullable enable // Bật kiểm tra nullability
using PersonalProjectManager.Models; // Namespace chứa Objective
using System;
using System.Collections.ObjectModel; // Cần cho ObservableCollection
using System.ComponentModel;

namespace PersonalProjectManager.ViewModels
{
    /// <summary>
    /// ViewModel đại diện cho một Objective hiển thị trên giao diện người dùng.
    /// Chứa thông tin của Objective và danh sách các TaskViewModel gốc thuộc về nó.
    /// </summary>
    public class ObjectiveViewModel : ViewModelBase
    {
        // Giữ một tham chiếu đến đối tượng Model gốc
        public Objective ObjectiveModel { get; private set; }

        // Danh sách các TaskViewModel gốc thuộc Objective này
        // Dùng ObservableCollection để TreeView tự động cập nhật khi có Task được thêm/xóa
        public ObservableCollection<TaskViewModel> Tasks { get; } = new ObservableCollection<TaskViewModel>();

        // Các thuộc tính của Objective cần hiển thị trên View (trích xuất từ Model)
        public string ObjectiveName => ObjectiveModel.ObjectiveName;
        public DateTime StartDate => ObjectiveModel.StartDate;
        public DateTime EndDate => ObjectiveModel.EndDate;

        // Chúng ta cần một cách để thông báo thay đổi Progress từ Model lên View
        // Cách 1: Tạo property riêng và cập nhật nó khi Model thay đổi (phức tạp hơn)
        // Cách 2: Binding trực tiếp vào Model.Progress (đơn giản hơn nhưng phá vỡ MVVM một chút)
        // Cách 3: ObjectiveModel tự triển khai INotifyPropertyChanged (tốt nhất nhưng cần sửa Model)
        // Tạm thời dùng cách 2 cho Progress để đơn giản:
        public double Progress => ObjectiveModel.Progress;

        /// <summary>
        /// Constructor nhận đối tượng Objective model.
        /// </summary>
        public ObjectiveViewModel(Objective objective)
        {
            ObjectiveModel = objective ?? throw new ArgumentNullException(nameof(objective));
        }

        /// <summary>
        /// Phương thức để cập nhật lại thông báo thay đổi cho Progress
        /// (Cần gọi từ bên ngoài khi biết progress của Objective đã thay đổi trong DB)
        /// </summary>
        public void RefreshProgress()
        {
            OnPropertyChanged(nameof(Progress));
        }

        // Có thể thêm các Command liên quan đến Objective ở đây nếu cần (ví dụ: Edit, Delete Objective)
    }
}
#nullable restore

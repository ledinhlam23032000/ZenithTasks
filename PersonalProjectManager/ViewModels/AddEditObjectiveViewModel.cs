#nullable enable
using PersonalProjectManager.Models;
using System;
using System.Windows.Input; // For ICommand

namespace PersonalProjectManager.ViewModels
{
    public class AddEditObjectiveViewModel : ViewModelBase
    {
        private string _objectiveName = string.Empty;
        private DateTime _startDate = DateTime.Today;
        private DateTime _endDate = DateTime.Today.AddDays(7);
        private string _title = "Thêm Mục tiêu mới";
        private bool _isEditMode = false;
        private string? _errorMessage;

        // THÊM Property ProjectId
        public int ProjectId { get; set; }

        public string Title { get => _title; private set => SetProperty(ref _title, value); }
        public bool IsEditMode => _isEditMode;

        public string ObjectiveName
        {
            get => _objectiveName;
            // Tự động xóa lỗi khi người dùng nhập tên
            set { if (SetProperty(ref _objectiveName, value)) ValidateData(); }
        }
        public DateTime StartDate
        {
            get => _startDate;
            set
            {
                if (SetProperty(ref _startDate, value)) ValidateDates();
            }
        }
        public DateTime EndDate
        {
            get => _endDate;
            set
            {
                if (SetProperty(ref _endDate, value)) ValidateDates();
            }
        }

        public string? ErrorMessage { get => _errorMessage; private set => SetProperty(ref _errorMessage, value); }
        public bool HasError => !string.IsNullOrEmpty(ErrorMessage);

        private Objective? _originalObjective;

        public Action<Objective>? OnSave { get; set; }
        public Action? OnCancel { get; set; }

        // Constructor for adding - ProjectId cần được set từ bên ngoài sau khi tạo instance
        public AddEditObjectiveViewModel()
        {
            _isEditMode = false;
            Title = "Thêm Mục tiêu mới";
            // ProjectId sẽ được gán bởi ProjectDetailViewModel
        }

        // Constructor for editing
        public AddEditObjectiveViewModel(Objective objectiveToEdit)
        {
            _isEditMode = true;
            Title = "Chỉnh sửa Mục tiêu";
            _originalObjective = objectiveToEdit;

            ObjectiveName = objectiveToEdit.ObjectiveName;
            StartDate = objectiveToEdit.StartDate;
            EndDate = objectiveToEdit.EndDate;
            ProjectId = objectiveToEdit.ProjectId; // Lấy ProjectId từ objective gốc
        }

        private bool ValidateData()
        {
            if (string.IsNullOrWhiteSpace(ObjectiveName))
            {
                SetError("Tên mục tiêu không được để trống.");
                return false;
            }
            if (!ValidateDates()) // ValidateDates sẽ tự set ErrorMessage nếu lỗi
            {
                // Không cần làm gì thêm vì ValidateDates đã set lỗi
                return false;
            }
            ClearError(); // Xóa lỗi nếu mọi thứ hợp lệ
            return true;
        }

        private bool ValidateDates()
        {
            if (StartDate > EndDate)
            {
                SetError("Ngày bắt đầu không thể sau ngày kết thúc.");
                return false;
            }
            // Xóa lỗi về ngày nếu đã hợp lệ và lỗi hiện tại là lỗi về ngày
            if (ErrorMessage?.Contains("Ngày bắt đầu") == true) ClearError();
            return true;
        }

        // Hàm helper để set và clear lỗi, đồng thời cập nhật HasError
        private void SetError(string message)
        {
            if (_errorMessage != message)
            {
                ErrorMessage = message;
                OnPropertyChanged(nameof(HasError));
            }
        }
        private void ClearError()
        {
            if (_errorMessage != null)
            {
                ErrorMessage = null;
                OnPropertyChanged(nameof(HasError));
            }
        }


        public bool Save()
        {
            if (!ValidateData())
            {
                return false;
            }

            // Tạo hoặc cập nhật đối tượng Objective
            Objective resultObjective = _originalObjective ?? new Objective();

            resultObjective.ObjectiveName = ObjectiveName.Trim();
            resultObjective.StartDate = StartDate;
            resultObjective.EndDate = EndDate;
            resultObjective.ProjectId = this.ProjectId; // Gán ProjectId đã lưu

            if (_originalObjective != null)
            {
                resultObjective.Progress = _originalObjective.Progress;
            }
            else
            {
                resultObjective.Progress = 0; // Progress mặc định cho objective mới
            }


            // Gọi Action để báo cho cửa sổ dialog biết việc lưu thành công
            OnSave?.Invoke(resultObjective);
            return true; // Trả về true để báo hiệu lưu thành công (cho việc đóng dialog)
        }

        public void Cancel()
        {
            OnCancel?.Invoke(); // Gọi Action để báo cho cửa sổ dialog
        }
    }
}
#nullable restore
#nullable enable
using PersonalProjectManager.Models;
using PersonalProjectManager.Services;
using System;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows.Input;

namespace PersonalProjectManager.ViewModels
{
    public class CreateProjectViewModel : ViewModelBase
    {
        private readonly ProjectService _projectService;

        private string _projectName = string.Empty;
        private string _owner = string.Empty;
        private DateTime _startDate = DateTime.Today;
        private DateTime _endDate = DateTime.Today.AddMonths(1);
        private string _resources = string.Empty;
        private string? _statusMessage;
        private bool _isStatusError = false;
        private bool _isSaving = false;

        public string ProjectName
        {
            get => _projectName;
            set
            {
                if (SetProperty(ref _projectName, value))
                {
                    ClearStatusMessage();
                    // CommandManager sẽ tự cập nhật CanExecute
                }
            }
        }
        public string Owner { get => _owner; set => SetProperty(ref _owner, value); }
        public DateTime StartDate
        {
            get => _startDate;
            set
            {
                if (SetProperty(ref _startDate, value))
                {
                    ClearStatusMessage();
                    ValidateDates();
                    // CommandManager sẽ tự cập nhật CanExecute
                }
            }
        }
        public DateTime EndDate
        {
            get => _endDate;
            set
            {
                if (SetProperty(ref _endDate, value))
                {
                    ClearStatusMessage();
                    ValidateDates();
                    // CommandManager sẽ tự cập nhật CanExecute
                }
            }
        }
        public string Resources { get => _resources; set => SetProperty(ref _resources, value); }
        public string? StatusMessage { get => _statusMessage; private set => SetProperty(ref _statusMessage, value); }
        public bool IsStatusError { get => _isStatusError; private set => SetProperty(ref _isStatusError, value); }
        public bool HasStatusMessage => !string.IsNullOrEmpty(StatusMessage);
        public bool IsSaving { get => _isSaving; private set => SetProperty(ref _isSaving, value); }

        public ICommand SaveProjectCommand { get; }
        public ICommand ClearFormCommand { get; }

        public CreateProjectViewModel(ProjectService projectService)
        {
            _projectService = projectService ?? throw new ArgumentNullException(nameof(projectService));
            SaveProjectCommand = new RelayCommand(async _ => await ExecuteSaveProjectAsync(), CanExecuteSaveProject);
            ClearFormCommand = new RelayCommand(_ => ClearForm());
            Debug.WriteLine("[CreateProjectViewModel] Initialized.");
        }

        private void ClearStatusMessage(bool clearErrorFlag = true)
        {
            StatusMessage = null;
            if (clearErrorFlag) IsStatusError = false;
            OnPropertyChanged(nameof(HasStatusMessage));
        }

        private void SetStatusMessage(string message, bool isError)
        {
            StatusMessage = message;
            IsStatusError = isError;
            OnPropertyChanged(nameof(HasStatusMessage));
        }

        private bool ValidateDates()
        {
            if (StartDate > EndDate)
            {
                SetStatusMessage("Lỗi: Ngày bắt đầu không thể sau ngày kết thúc.", true);
                return false;
            }
            if (IsStatusError && StatusMessage?.Contains("Ngày bắt đầu") == true)
            {
                ClearStatusMessage();
            }
            return true;
        }

        private bool CanExecuteSaveProject(object? parameter)
        {
            return !string.IsNullOrWhiteSpace(ProjectName)
                   && !IsSaving
                   && ValidateDates();
        }

        private async Task ExecuteSaveProjectAsync()
        {
            Debug.WriteLine("[CreateProjectViewModel] ExecuteSaveProjectAsync called.");
            if (!CanExecuteSaveProject(null))
            {
                if (string.IsNullOrWhiteSpace(ProjectName))
                {
                    SetStatusMessage("Tên dự án không được để trống.", true);
                }
                // CommandManager sẽ tự cập nhật nút Save
                return;
            }

            IsSaving = true; // Cập nhật IsSaving sẽ tự động ảnh hưởng CanExecute
            ClearStatusMessage();
            SetStatusMessage("Đang tạo dự án...", false);

            try
            {
                Project newProject = new Project
                {
                    ProjectName = this.ProjectName.Trim(),
                    Owner = this.Owner?.Trim() ?? string.Empty,
                    StartDate = this.StartDate,
                    EndDate = this.EndDate,
                    Resources = this.Resources?.Trim() ?? string.Empty,
                    Status = "Đang triển khai"
                };

                Debug.WriteLine($"[CreateProjectViewModel] Attempting to create project: {newProject.ProjectName}");
                Project? createdProject = await Task.Run(() => _projectService.CreateNewProject(newProject));

                if (createdProject != null && createdProject.ProjectId > 0)
                {
                    string successMsg = $"Dự án '{createdProject.ProjectName}' (ID: {createdProject.ProjectId}) đã được tạo thành công!";
                    SetStatusMessage(successMsg, false);
                    Debug.WriteLine($"[CreateProjectViewModel] {successMsg}");
                    ClearForm(keepSuccessMessage: true);
                }
                else
                {
                    SetStatusMessage("Lỗi: Không thể tạo dự án. Vui lòng kiểm tra log hoặc thử lại.", true);
                    Debug.WriteLine("[CreateProjectViewModel] Project creation failed.");
                }
            }
            catch (Exception ex)
            {
                string errorMsg = $"Lỗi hệ thống khi tạo dự án: {ex.Message}";
                SetStatusMessage(errorMsg, true);
                Debug.WriteLine($"[CreateProjectViewModel] !!! Exception in ExecuteSaveProjectAsync: {ex}");
            }
            finally
            {
                IsSaving = false; // Cập nhật IsSaving sẽ tự động cập nhật CanExecute
            }
        }

        private void ClearForm(bool keepSuccessMessage = false)
        {
            ProjectName = string.Empty;
            Owner = string.Empty;
            StartDate = DateTime.Today;
            EndDate = DateTime.Today.AddMonths(1);
            Resources = string.Empty;

            if (!keepSuccessMessage || IsStatusError)
            {
                ClearStatusMessage();
            }
            Debug.WriteLine("[CreateProjectViewModel] Create project form cleared.");
            // CanExecute của SaveProjectCommand sẽ tự cập nhật do ProjectName thay đổi
        }
    }
}
#nullable restore
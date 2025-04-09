#nullable enable
using Microsoft.Extensions.DependencyInjection;
using PersonalProjectManager.DataAccess;
using PersonalProjectManager.Services;
using System;
using System.Diagnostics;
using System.Windows;
using System.Windows.Input;

namespace PersonalProjectManager.ViewModels
{
    public class MainViewModel : ViewModelBase
    {
        private ViewModelBase _currentViewModel;
        private string? _statusMessage;
        private bool _isStatusError = false;

        private readonly IServiceProvider _serviceProvider;

        public ViewModelBase CurrentViewModel
        {
            get => _currentViewModel;
            private set => SetProperty(ref _currentViewModel, value);
        }
        public string? StatusMessage { get => _statusMessage; private set => SetProperty(ref _statusMessage, value); }
        public bool IsStatusError { get => _isStatusError; private set => SetProperty(ref _isStatusError, value); }
        public bool HasStatusMessage => !string.IsNullOrEmpty(StatusMessage);

        public ICommand NavigateCommand { get; }

        public MainViewModel(IServiceProvider serviceProvider)
        {
            Debug.WriteLine("--- MainViewModel Instantiating (using IServiceProvider) ---");
            _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
            Debug.WriteLine("--- ServiceProvider stored in MainViewModel ---");

            NavigateCommand = new RelayCommand(ExecuteNavigate);
            Debug.WriteLine("--- Navigation command initialized ---");

            try
            {
                _currentViewModel = _serviceProvider.GetRequiredService<DashboardViewModel>();
                Debug.WriteLine($"--- Initial ViewModel set to: {_currentViewModel.GetType().Name} ---");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"!!! FATAL ERROR: Could not resolve initial DashboardViewModel: {ex.Message}\n{ex.StackTrace}");
                SetStatusMessage($"Lỗi nghiêm trọng: Không thể tải màn hình chính. {ex.Message}", true);
                MessageBox.Show($"Lỗi nghiêm trọng khi khởi tạo màn hình chính:\n{ex.Message}\nỨng dụng có thể không hoạt động đúng.", "Lỗi Khởi Tạo", MessageBoxButton.OK, MessageBoxImage.Error);
                _currentViewModel = new EmptyViewModel();
            }
            Debug.WriteLine("--- MainViewModel Instantiation Complete ---");
        }

        private void ExecuteNavigate(object? parameter)
        {
            string? targetViewName = null;
            int? projectId = null;
            ViewModelBase? newViewModel = null;
            ClearStatusMessage();

            if (parameter is int pId && pId > 0)
            {
                targetViewName = "ProjectDetail";
                projectId = pId;
            }
            else if (parameter is string viewName)
            {
                targetViewName = viewName;
            }
            else
            {
                string errorMsg = $"Tham số điều hướng không hợp lệ: '{parameter ?? "null"}'.";
                Debug.WriteLine($"[MainViewModel] Warning: {errorMsg}");
                SetStatusMessage(errorMsg, true);
                return;
            }

            Debug.WriteLine($"[MainViewModel] NavigateCommand executed. Target: '{targetViewName}', ProjectId: {projectId?.ToString() ?? "N/A"}");

            try
            {
                switch (targetViewName.ToLowerInvariant())
                {
                    case "dashboard":
                        newViewModel = _serviceProvider.GetRequiredService<DashboardViewModel>();
                        break;
                    case "createproject":
                        newViewModel = _serviceProvider.GetRequiredService<CreateProjectViewModel>();
                        break;
                    case "projectlist":
                        newViewModel = _serviceProvider.GetRequiredService<ProjectListViewModel>();
                        break;
                    case "completedprojectlist":
                        newViewModel = _serviceProvider.GetRequiredService<CompletedProjectListViewModel>();
                        break;
                    case "progressdashboard":
                        newViewModel = _serviceProvider.GetRequiredService<ProgressDashboardViewModel>();
                        break;
                    case "projectdetail":
                        if (projectId.HasValue)
                        {
                            newViewModel = new ProjectDetailViewModel(
                                projectId.Value,
                                _serviceProvider.GetRequiredService<ProjectService>(),
                                _serviceProvider.GetRequiredService<ObjectiveService>(),
                                _serviceProvider.GetRequiredService<TaskService>(),
                                _serviceProvider.GetRequiredService<ObjectiveRepository>(),
                                _serviceProvider.GetRequiredService<TaskRepository>(),
                                this);
                        }
                        else
                        {
                            throw new InvalidOperationException("Cần ProjectId để điều hướng đến Chi tiết dự án.");
                        }
                        break;
                    default:
                        throw new ArgumentException($"Đích điều hướng không xác định: '{targetViewName}'");
                }

                if (newViewModel != null && (newViewModel.GetType() != CurrentViewModel?.GetType() || targetViewName.ToLowerInvariant() == "projectdetail"))
                {
                    // Dispose ViewModel cũ nếu nó implement IDisposable (cần thêm logic này nếu có tài nguyên cần giải phóng)
                    // if (CurrentViewModel is IDisposable disposable) disposable.Dispose();

                    CurrentViewModel = newViewModel;
                    Debug.WriteLine($"[MainViewModel] CurrentViewModel set to: {CurrentViewModel.GetType().Name}");
                }
                else if (newViewModel == null)
                {
                    Debug.WriteLine($"[MainViewModel] Warning: Could not create or resolve ViewModel for target '{targetViewName}'. Navigation aborted.");
                    SetStatusMessage($"Không thể điều hướng đến '{targetViewName}'.", true);
                }
                else
                {
                    Debug.WriteLine($"[MainViewModel] Navigation target '{targetViewName}' is the same type as the current view model. Navigation skipped.");
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[MainViewModel] !!! ERROR during navigation or ViewModel creation for target '{targetViewName}': {ex}");
                SetStatusMessage($"Lỗi khi điều hướng đến '{targetViewName}': {ex.Message}", true);
                try
                {
                    CurrentViewModel = _serviceProvider.GetRequiredService<DashboardViewModel>();
                    Debug.WriteLine($"[MainViewModel] Navigated back to Dashboard due to error.");
                }
                catch (Exception dbEx)
                {
                    Debug.WriteLine($"[MainViewModel] !!! FATAL ERROR: Could not navigate back to Dashboard: {dbEx.Message}");
                    CurrentViewModel = new EmptyViewModel();
                }
            }
        }

        private void SetStatusMessage(string message, bool isError)
        {
            StatusMessage = message;
            IsStatusError = isError;
            OnPropertyChanged(nameof(HasStatusMessage));
        }

        private void ClearStatusMessage()
        {
            StatusMessage = null;
            IsStatusError = false;
            OnPropertyChanged(nameof(HasStatusMessage));
        }

        private class EmptyViewModel : ViewModelBase { }
    }
}
#nullable restore
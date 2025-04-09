#nullable enable
using PersonalProjectManager.Services;
using System;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;

namespace PersonalProjectManager.ViewModels
{
    public class DashboardViewModel : ViewModelBase
    {
        private readonly ProjectService _projectService;
        private readonly MainViewModel _mainViewModel;

        private int _activeProjectCount;
        private int _completedProjectCount;
        private bool _isLoading = false;
        private string? _statusMessage;
        private bool _isStatusError = false;

        public string WelcomeMessage { get; } = "Tổng quan Dự án Cá nhân";
        public int ActiveProjectCount { get => _activeProjectCount; private set => SetProperty(ref _activeProjectCount, value); }
        public int CompletedProjectCount { get => _completedProjectCount; private set => SetProperty(ref _completedProjectCount, value); }
        public bool IsLoading
        {
            get => _isLoading;
            private set
            {
                // Chỉ gọi SetProperty nếu giá trị thay đổi
                if (SetProperty(ref _isLoading, value))
                {
                    // Không cần gọi RaiseCanExecuteChanged ở đây nữa
                    // CommandManager.RequerySuggested sẽ tự động cập nhật CanExecute khi IsLoading thay đổi
                    // (RelayCommand đã đăng ký với CommandManager.RequerySuggested)
                }
            }
        }
        public string? StatusMessage { get => _statusMessage; private set => SetProperty(ref _statusMessage, value); }
        public bool IsStatusError { get => _isStatusError; private set => SetProperty(ref _isStatusError, value); }
        public bool HasStatusMessage => !string.IsNullOrEmpty(StatusMessage);

        public ICommand NavigateCommand => _mainViewModel.NavigateCommand;
        public ICommand RefreshDashboardCommand { get; }
        public ICommand ViewActiveProjectsCommand { get; }
        public ICommand ViewCompletedProjectsCommand { get; }
        public ICommand CreateNewProjectCommand { get; }

        public DashboardViewModel(ProjectService projectService, MainViewModel mainViewModel)
        {
            _projectService = projectService ?? throw new ArgumentNullException(nameof(projectService));
            _mainViewModel = mainViewModel ?? throw new ArgumentNullException(nameof(mainViewModel));
            Debug.WriteLine("--- DashboardViewModel Initializing ---");

            RefreshDashboardCommand = new RelayCommand(async _ => await LoadDashboardDataAsync(), _ => !IsLoading);
            ViewActiveProjectsCommand = new RelayCommand(param => NavigateCommand.Execute("ProjectList"), param => NavigateCommand.CanExecute("ProjectList"));
            ViewCompletedProjectsCommand = new RelayCommand(param => NavigateCommand.Execute("CompletedProjectList"), param => NavigateCommand.CanExecute("CompletedProjectList"));
            CreateNewProjectCommand = new RelayCommand(param => NavigateCommand.Execute("CreateProject"), param => NavigateCommand.CanExecute("CreateProject"));

            _ = LoadDashboardDataAsync();
            Debug.WriteLine("--- DashboardViewModel Initialized ---");
        }

        private async Task LoadDashboardDataAsync()
        {
            if (IsLoading) return;
            IsLoading = true;
            ClearStatusMessage();
            Debug.WriteLine("[DashboardViewModel] Loading dashboard data...");

            int activeCount = 0;
            int completedCount = 0;

            try
            {
                var activeCountTask = Task.Run(() => _projectService.GetAllActiveProjects()?.Count ?? 0);
                var completedCountTask = Task.Run(() => _projectService.GetAllCompletedProjects()?.Count ?? 0);

                await Task.WhenAll(activeCountTask, completedCountTask);

                activeCount = activeCountTask.Result;
                completedCount = completedCountTask.Result;

                await SafeDispatchAsync(() =>
                {
                    ActiveProjectCount = activeCount;
                    CompletedProjectCount = completedCount;
                    Debug.WriteLine($"[DashboardViewModel] Data loaded: Active={ActiveProjectCount}, Completed={CompletedProjectCount}");
                });
            }
            catch (Exception ex)
            {
                string errorMsg = $"Lỗi tải dữ liệu tổng quan: {ex.Message}";
                Debug.WriteLine($"[DashboardViewModel] !!! ERROR loading dashboard data: {ex}");
                await SafeDispatchAsync(() =>
                {
                    ActiveProjectCount = 0;
                    CompletedProjectCount = 0;
                    SetStatusMessage(errorMsg, true);
                });
            }
            finally
            {
                await SafeDispatchAsync(() => IsLoading = false);
                // CommandManager sẽ tự cập nhật CanExecute của RefreshDashboardCommand do IsLoading thay đổi
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

        private async Task SafeDispatchAsync(Action action)
        {
            Dispatcher? dispatcher = Application.Current?.Dispatcher;
            if (dispatcher != null && !dispatcher.CheckAccess())
            {
                await dispatcher.InvokeAsync(action);
            }
            else if (dispatcher != null)
            {
                try { action(); } catch (Exception ex) { Debug.WriteLine($"[DashboardViewModel.SafeDispatchAsync] Error: {ex.Message}"); }
            }
            else { Debug.WriteLine("[DashboardViewModel.SafeDispatchAsync] Warning: Dispatcher is null."); }
        }
    }
}
#nullable restore
#nullable enable
using PersonalProjectManager.Models;
using PersonalProjectManager.Services;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;

namespace PersonalProjectManager.ViewModels
{
    public class CompletedProjectListViewModel : ViewModelBase
    {
        private readonly ProjectService _projectService;
        private readonly MainViewModel? _mainViewModel;

        private ObservableCollection<Project>? _completedProjects;
        private Project? _selectedProject;
        private bool _isLoading = false;
        private string? _statusMessage;
        private bool _isStatusError = false;

        public ObservableCollection<Project>? CompletedProjects { get => _completedProjects; private set => SetProperty(ref _completedProjects, value); }
        public Project? SelectedProject
        {
            get => _selectedProject;
            set
            {
                if (SetProperty(ref _selectedProject, value))
                {
                    Debug.WriteLine($"[CompletedProjectListViewModel] Project selected: ID={(value?.ProjectId.ToString() ?? "null")}, Name='{value?.ProjectName ?? "null"}'");
                    // Không cần gọi RaiseCanExecuteChanged nữa
                }
            }
        }
        public bool IsLoading { get => _isLoading; private set => SetProperty(ref _isLoading, value); }
        public string? StatusMessage { get => _statusMessage; private set => SetProperty(ref _statusMessage, value); }
        public bool IsStatusError { get => _isStatusError; private set => SetProperty(ref _isStatusError, value); }
        public bool HasStatusMessage => !string.IsNullOrEmpty(StatusMessage);

        public ICommand RefreshCommand { get; }
        public ICommand ViewDetailCommand { get; }

        public CompletedProjectListViewModel(ProjectService projectService, MainViewModel? mainViewModel = null)
        {
            _projectService = projectService ?? throw new ArgumentNullException(nameof(projectService));
            _mainViewModel = mainViewModel;
            Debug.WriteLine("--- CompletedProjectListViewModel Initializing ---");

            RefreshCommand = new RelayCommand(async _ => await LoadCompletedProjectsAsync(), _ => !IsLoading);
            ViewDetailCommand = new RelayCommand(ExecuteViewDetail, _ => SelectedProject != null && !IsLoading && _mainViewModel != null);

            _ = LoadCompletedProjectsAsync();
            Debug.WriteLine("--- CompletedProjectListViewModel Initialized ---");
        }

        private async Task LoadCompletedProjectsAsync()
        {
            if (IsLoading) return;

            IsLoading = true;
            ClearStatusMessage();
            SetStatusMessage("Đang tải danh sách dự án đã hoàn thành...", false);
            Debug.WriteLine("[CompletedProjectListViewModel] Loading completed projects...");

            await SafeDispatchAsync(() => SelectedProject = null);

            List<Project> projects = new List<Project>();

            try
            {
                projects = await Task.Run(() => _projectService.GetAllCompletedProjects());

                await SafeDispatchAsync(() =>
                {
                    CompletedProjects = new ObservableCollection<Project>(projects);
                    Debug.WriteLine($"[CompletedProjectListViewModel] Loaded {CompletedProjects?.Count ?? 0} completed projects.");
                    if (CompletedProjects == null || !CompletedProjects.Any())
                    {
                        SetStatusMessage("Không có dự án nào đã hoàn thành.", false);
                    }
                    else
                    {
                        ClearStatusMessage();
                    }
                });
            }
            catch (Exception ex)
            {
                string errorMsg = $"Lỗi tải danh sách dự án đã hoàn thành: {ex.Message}";
                Debug.WriteLine($"[CompletedProjectListViewModel] !!! ERROR loading completed projects: {ex}");
                await SafeDispatchAsync(() =>
                {
                    CompletedProjects = new ObservableCollection<Project>();
                    SetStatusMessage(errorMsg, true);
                });
            }
            finally
            {
                await SafeDispatchAsync(() =>
                {
                    IsLoading = false;
                    // CanExecute sẽ tự cập nhật khi IsLoading thay đổi
                });
            }
        }

        private void ExecuteViewDetail(object? parameter)
        {
            Project? projectToView = parameter as Project ?? SelectedProject;

            if (_mainViewModel != null && projectToView != null)
            {
                Debug.WriteLine($"[CompletedProjectListViewModel] Navigating back to details for completed Project ID: {projectToView.ProjectId}");
                if (_mainViewModel.NavigateCommand.CanExecute(projectToView.ProjectId))
                {
                    _mainViewModel.NavigateCommand.Execute(projectToView.ProjectId);
                }
                else
                {
                    string errorMsg = $"Không thể thực hiện điều hướng đến chi tiết dự án ID: {projectToView.ProjectId} lúc này.";
                    Debug.WriteLine($"[CompletedProjectListViewModel] !!! ERROR: {errorMsg}");
                    SetStatusMessage(errorMsg, true);
                }
            }
            else if (projectToView == null)
            {
                Debug.WriteLine("[CompletedProjectListViewModel] ViewDetail executed but no project selected/provided.");
                SetStatusMessage("Vui lòng chọn một dự án để xem chi tiết.", true);
            }
            else // _mainViewModel is null
            {
                Debug.WriteLine("[CompletedProjectListViewModel] Warning: Cannot navigate, MainViewModel is not available.");
                SetStatusMessage("Lỗi: Không thể thực hiện điều hướng.", true);
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
                try { action(); } catch (Exception ex) { Debug.WriteLine($"[CompletedProjectListViewModel.SafeDispatchAsync] Error: {ex.Message}"); }
            }
            else { Debug.WriteLine("[CompletedProjectListViewModel.SafeDispatchAsync] Warning: Dispatcher is null."); }
        }
    }
}
#nullable restore
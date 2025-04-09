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
    public class ProjectListViewModel : ViewModelBase
    {
        private readonly ProjectService _projectService;
        private readonly MainViewModel _mainViewModel;

        private ObservableCollection<Project>? _projects;
        private Project? _selectedProject;
        private bool _isLoading = false;
        private string? _statusMessage;
        private bool _isStatusError = false;

        public ObservableCollection<Project>? Projects { get => _projects; private set => SetProperty(ref _projects, value); }
        public Project? SelectedProject
        {
            get => _selectedProject;
            set
            {
                if (SetProperty(ref _selectedProject, value))
                {
                    Debug.WriteLine($"[ProjectListViewModel] Project selected: ID={(value?.ProjectId.ToString() ?? "null")}, Name='{value?.ProjectName ?? "null"}'");
                    // CanExecute của ViewProjectDetailCommand sẽ tự cập nhật
                }
            }
        }
        public bool IsLoading { get => _isLoading; private set => SetProperty(ref _isLoading, value); }
        public string? StatusMessage { get => _statusMessage; private set => SetProperty(ref _statusMessage, value); }
        public bool IsStatusError { get => _isStatusError; private set => SetProperty(ref _isStatusError, value); }
        public bool HasStatusMessage => !string.IsNullOrEmpty(StatusMessage);

        public ICommand RefreshProjectsCommand { get; }
        public ICommand ViewProjectDetailCommand { get; }

        public ProjectListViewModel(ProjectService projectService, MainViewModel mainViewModel)
        {
            _projectService = projectService ?? throw new ArgumentNullException(nameof(projectService));
            _mainViewModel = mainViewModel ?? throw new ArgumentNullException(nameof(mainViewModel));
            Debug.WriteLine("--- ProjectListViewModel Initializing ---");

            RefreshProjectsCommand = new RelayCommand(async _ => await LoadActiveProjectsAsync(), _ => !IsLoading);
            ViewProjectDetailCommand = new RelayCommand(ExecuteViewProjectDetail, CanExecuteViewProjectDetail);

            _ = LoadActiveProjectsAsync();
            Debug.WriteLine("--- ProjectListViewModel Initialized ---");
        }

        private async Task LoadActiveProjectsAsync()
        {
            if (IsLoading) return;

            IsLoading = true; // Property setter sẽ tự động kích hoạt CommandManager.RequerySuggested nếu cần
            ClearStatusMessage();
            SetStatusMessage("Đang tải danh sách dự án...", false);
            Debug.WriteLine("[ProjectListViewModel] Loading active projects...");

            await SafeDispatchAsync(() => SelectedProject = null);

            List<Project> activeProjects = new List<Project>();

            try
            {
                activeProjects = await Task.Run(() => _projectService.GetAllActiveProjects());

                await SafeDispatchAsync(() =>
                {
                    Projects = new ObservableCollection<Project>(activeProjects);
                    Debug.WriteLine($"[ProjectListViewModel] Loaded {Projects?.Count ?? 0} active projects.");
                    if (Projects == null || !Projects.Any())
                    {
                        SetStatusMessage("Không có dự án nào đang triển khai.", false);
                    }
                    else
                    {
                        ClearStatusMessage();
                    }
                });
            }
            catch (Exception ex)
            {
                string errorMsg = $"Lỗi tải danh sách dự án: {ex.Message}";
                Debug.WriteLine($"[ProjectListViewModel] !!! ERROR loading active projects: {ex}");
                await SafeDispatchAsync(() =>
                {
                    Projects = new ObservableCollection<Project>();
                    SetStatusMessage(errorMsg, true);
                });
            }
            finally
            {
                await SafeDispatchAsync(() =>
                {
                    IsLoading = false; // Property setter sẽ tự động kích hoạt CommandManager.RequerySuggested
                });
            }
        }

        private bool CanExecuteViewProjectDetail(object? parameter)
        {
            return SelectedProject != null && !IsLoading;
        }

        private void ExecuteViewProjectDetail(object? parameter)
        {
            Project? projectToView = parameter as Project ?? SelectedProject;

            if (projectToView != null)
            {
                Debug.WriteLine($"[ProjectListViewModel] Navigating to details for Project ID: {projectToView.ProjectId}");
                if (_mainViewModel.NavigateCommand.CanExecute(projectToView.ProjectId))
                {
                    _mainViewModel.NavigateCommand.Execute(projectToView.ProjectId);
                }
                else
                {
                    string errorMsg = $"Không thể thực hiện điều hướng đến chi tiết dự án ID: {projectToView.ProjectId} lúc này.";
                    Debug.WriteLine($"[ProjectListViewModel] !!! ERROR: {errorMsg}");
                    SetStatusMessage(errorMsg, true);
                }
            }
            else
            {
                Debug.WriteLine("[ProjectListViewModel] ViewProjectDetailCommand executed but no project selected or provided.");
                SetStatusMessage("Vui lòng chọn một dự án để xem chi tiết.", true);
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
                try { action(); } catch (Exception ex) { Debug.WriteLine($"[ProjectListViewModel.SafeDispatchAsync] Error: {ex.Message}"); }
            }
            else { Debug.WriteLine("[ProjectListViewModel.SafeDispatchAsync] Warning: Dispatcher is null."); }
        }
    }
}
#nullable restore
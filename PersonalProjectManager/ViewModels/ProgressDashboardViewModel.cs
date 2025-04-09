#nullable enable
using PersonalProjectManager.Services;
using PersonalProjectManager.ViewModels;
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
    public class ProgressDashboardViewModel : ViewModelBase
    {
        private readonly ProjectService _projectService;
        private readonly MainViewModel? _mainViewModel;

        private ObservableCollection<ProjectSummaryItem>? _projectSummaries;
        private bool _isLoading = false;
        private string? _statusMessage;
        private bool _isStatusError = false;

        public ObservableCollection<ProjectSummaryItem>? ProjectSummaries { get => _projectSummaries; private set => SetProperty(ref _projectSummaries, value); }
        public bool IsLoading { get => _isLoading; private set => SetProperty(ref _isLoading, value); }
        public string? StatusMessage { get => _statusMessage; private set => SetProperty(ref _statusMessage, value); }
        public bool IsStatusError { get => _isStatusError; private set => SetProperty(ref _isStatusError, value); }
        public bool HasStatusMessage => !string.IsNullOrEmpty(StatusMessage);

        public ICommand RefreshCommand { get; }
        public ICommand ViewProjectDetailCommand { get; }

        public ProgressDashboardViewModel(ProjectService projectService, MainViewModel? mainViewModel = null)
        {
            _projectService = projectService ?? throw new ArgumentNullException(nameof(projectService));
            _mainViewModel = mainViewModel;
            Debug.WriteLine("--- ProgressDashboardViewModel Initializing ---");

            RefreshCommand = new RelayCommand(async _ => await LoadProjectSummariesAsync(), _ => !IsLoading);
            ViewProjectDetailCommand = new RelayCommand(ExecuteViewProjectDetail, CanExecuteViewProjectDetail);

            _ = LoadProjectSummariesAsync();
            Debug.WriteLine("--- ProgressDashboardViewModel Initialized ---");
        }

        private async Task LoadProjectSummariesAsync()
        {
            if (IsLoading) return;

            IsLoading = true; // Setter sẽ tự gọi RequerySuggested nếu cần
            ClearStatusMessage();
            SetStatusMessage("Đang tải dữ liệu tiến độ...", false);
            Debug.WriteLine("[ProgressDashboardViewModel] Loading project summaries...");

            List<ProjectSummaryItem> summaries = new List<ProjectSummaryItem>();

            try
            {
                List<Models.Project> activeProjects = await Task.Run(() => _projectService.GetAllActiveProjects());

                if (activeProjects != null && activeProjects.Any())
                {
                    var summaryTasks = activeProjects.Select(async project =>
                    {
                        double progress = await Task.Run(() => _projectService.GetProjectOverallProgress(project.ProjectId) ?? 0.0);
                        return new ProjectSummaryItem
                        {
                            ProjectId = project.ProjectId,
                            ProjectName = project.ProjectName,
                            OverallProgress = progress
                        };
                    }).ToList();

                    var completedSummaries = await Task.WhenAll(summaryTasks);
                    summaries.AddRange(completedSummaries);
                }

                await SafeDispatchAsync(() =>
                {
                    ProjectSummaries = new ObservableCollection<ProjectSummaryItem>(summaries.OrderBy(s => s.ProjectName).ToList());
                    Debug.WriteLine($"[ProgressDashboardViewModel] Loaded {ProjectSummaries?.Count ?? 0} project summaries.");
                    if (ProjectSummaries == null || !ProjectSummaries.Any())
                    {
                        SetStatusMessage("Không có dự án nào đang hoạt động để hiển thị tiến độ.", false);
                    }
                    else
                    {
                        ClearStatusMessage();
                    }
                });
            }
            catch (Exception ex)
            {
                string errorMsg = $"Lỗi tải dữ liệu tiến độ: {ex.Message}";
                Debug.WriteLine($"[ProgressDashboardViewModel] !!! ERROR loading project summaries: {ex}");
                await SafeDispatchAsync(() =>
                {
                    ProjectSummaries = new ObservableCollection<ProjectSummaryItem>();
                    SetStatusMessage(errorMsg, true);
                });
            }
            finally
            {
                await SafeDispatchAsync(() => IsLoading = false); // Setter sẽ tự gọi RequerySuggested
            }
        }

        private bool CanExecuteViewProjectDetail(object? parameter)
        {
            return parameter is ProjectSummaryItem summary && summary.ProjectId > 0 && !IsLoading && _mainViewModel != null;
        }

        private void ExecuteViewProjectDetail(object? parameter)
        {
            if (parameter is ProjectSummaryItem summary && _mainViewModel != null)
            {
                Debug.WriteLine($"[ProgressDashboardViewModel] Navigating to details for Project ID: {summary.ProjectId}");
                if (_mainViewModel.NavigateCommand.CanExecute(summary.ProjectId))
                {
                    _mainViewModel.NavigateCommand.Execute(summary.ProjectId);
                }
                else
                {
                    string errorMsg = $"Không thể thực hiện điều hướng đến chi tiết dự án ID: {summary.ProjectId} lúc này.";
                    Debug.WriteLine($"[ProgressDashboardViewModel] !!! ERROR: {errorMsg}");
                    SetStatusMessage(errorMsg, true);
                }
            }
            else
            {
                Debug.WriteLine("[ProgressDashboardViewModel] ViewProjectDetail executed with invalid parameter or null MainViewModel.");
                SetStatusMessage("Không thể xem chi tiết dự án đã chọn.", true);
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
                try { action(); } catch (Exception ex) { Debug.WriteLine($"[ProgressDashboardViewModel.SafeDispatchAsync] Error: {ex.Message}"); }
            }
            else { Debug.WriteLine("[ProgressDashboardViewModel.SafeDispatchAsync] Warning: Dispatcher is null."); }
        }
    }
}
#nullable restore
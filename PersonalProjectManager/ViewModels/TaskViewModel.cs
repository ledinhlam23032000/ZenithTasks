#nullable enable
using PersonalProjectManager.Models;
using PersonalProjectManager.Services;
using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;

namespace PersonalProjectManager.ViewModels
{
    public class TaskViewModel : ViewModelBase
    {
        private readonly TaskService _taskService;
        private readonly ProjectDetailViewModel _projectDetailViewModel;

        public TaskItem TaskModel { get; private set; }
        public ObservableCollection<TaskViewModel> SubTasks { get; } = new ObservableCollection<TaskViewModel>();

        public string TaskName => TaskModel.TaskName;
        public string? Notes => TaskModel.Notes; // Notes có thể null
        public string Status => TaskModel.Status;
        public double Progress => TaskModel.Progress;

        private bool _isSelected;
        public bool IsSelected
        {
            get => _isSelected;
            set => SetProperty(ref _isSelected, value);
        }

        public bool IsCompleted
        {
            get => TaskModel.Status.Equals(TaskService.StatusCompleted, StringComparison.OrdinalIgnoreCase);
            set
            {
                if (value != IsCompleted)
                {
                    string newStatus = value ? TaskService.StatusCompleted : TaskService.StatusInProgress; // Đổi thành InProgress khi uncheck
                    Debug.WriteLine($"[TaskViewModel] Checkbox toggled for Task ID {TaskModel.TaskId}. Requesting status update to '{newStatus}'.");
                    _ = UpdateStatusAsync(newStatus);
                }
            }
        }

        private async Task UpdateStatusAsync(string newStatus)
        {
            bool success = false;
            try
            {
                success = await Task.Run(() => _taskService.UpdateTaskStatus(TaskModel.TaskId, newStatus));

                if (success)
                {
                    Debug.WriteLine($"[TaskViewModel] Task ID {TaskModel.TaskId} status update successful via Service to '{newStatus}'. Parent refresh requested.");
                    await _projectDetailViewModel.RequestRefreshAsync();
                }
                else
                {
                    Debug.WriteLine($"[TaskViewModel] TaskService failed to update status for Task ID {TaskModel.TaskId}. Reverting checkbox state visually.");
                    await SafeDispatchAsync(() =>
                        MessageBox.Show("Không thể cập nhật trạng thái công việc. Vui lòng thử lại.", "Lỗi Cập Nhật", MessageBoxButton.OK, MessageBoxImage.Warning)
                    );
                    OnPropertyChanged(nameof(IsCompleted));
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[TaskViewModel] !!! ERROR during UpdateStatusAsync for Task ID {TaskModel.TaskId}: {ex.Message}\n{ex.StackTrace}");
                await SafeDispatchAsync(() =>
                   MessageBox.Show($"Đã xảy ra lỗi hệ thống khi cập nhật trạng thái:\n{ex.Message}", "Lỗi Hệ thống", MessageBoxButton.OK, MessageBoxImage.Error)
                );
                OnPropertyChanged(nameof(IsCompleted));
            }
        }

        public TaskViewModel(TaskItem task, TaskService taskService, ProjectDetailViewModel projectDetailViewModel)
        {
            TaskModel = task ?? throw new ArgumentNullException(nameof(task));
            _taskService = taskService ?? throw new ArgumentNullException(nameof(taskService));
            _projectDetailViewModel = projectDetailViewModel ?? throw new ArgumentNullException(nameof(projectDetailViewModel));
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
                try { action(); } catch (Exception ex) { Debug.WriteLine($"[TaskViewModel.SafeDispatchAsync] Error: {ex.Message}"); }
            }
            else { Debug.WriteLine("[TaskViewModel.SafeDispatchAsync] Warning: Dispatcher is null."); }
        }
    }
}
#nullable restore
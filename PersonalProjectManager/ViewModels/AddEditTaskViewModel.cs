#nullable enable
using PersonalProjectManager.Models;
using PersonalProjectManager.Services;
using System;

namespace PersonalProjectManager.ViewModels
{
    public class AddEditTaskViewModel : ViewModelBase
    {
        private string _taskName = string.Empty;
        private string _notes = string.Empty;
        private string _title = "Thêm Nhiệm vụ mới";
        private bool _isEditMode = false;
        private string? _errorMessage;

        // Thông tin cần thiết để tạo/sửa Task
        public int ObjectiveId { get; }
        public int? ParentTaskId { get; }

        public string Title { get => _title; private set => SetProperty(ref _title, value); }
        public bool IsEditMode => _isEditMode;

        public string TaskName
        {
            get => _taskName;
            set => SetProperty(ref _taskName, value);
        }
        public string Notes
        {
            get => _notes;
            set => SetProperty(ref _notes, value);
        }

        public string? ErrorMessage { get => _errorMessage; private set => SetProperty(ref _errorMessage, value); }
        public bool HasError => !string.IsNullOrEmpty(ErrorMessage);

        private TaskItem? _originalTask;

        public Action<TaskItem>? OnSave { get; set; }
        public Action? OnCancel { get; set; }

        // Constructor for adding
        public AddEditTaskViewModel(int objectiveId, int? parentTaskId)
        {
            _isEditMode = false;
            Title = parentTaskId.HasValue ? "Thêm Nhiệm vụ con" : "Thêm Nhiệm vụ gốc";
            ObjectiveId = objectiveId;
            ParentTaskId = parentTaskId;
        }

        // Constructor for editing
        public AddEditTaskViewModel(TaskItem taskToEdit)
        {
            _isEditMode = true;
            Title = "Chỉnh sửa Nhiệm vụ";
            _originalTask = taskToEdit;

            ObjectiveId = taskToEdit.ObjectiveId;
            ParentTaskId = taskToEdit.ParentTaskId; // Giữ nguyên cha và objective

            TaskName = taskToEdit.TaskName;
            Notes = taskToEdit.Notes ?? string.Empty;
            // Status và Progress không sửa ở đây
        }

        private bool ValidateData()
        {
            ErrorMessage = null;
            if (string.IsNullOrWhiteSpace(TaskName))
            {
                ErrorMessage = "Tên nhiệm vụ không được để trống.";
                OnPropertyChanged(nameof(HasError));
                return false;
            }
            OnPropertyChanged(nameof(HasError));
            return true;
        }

        public bool Save()
        {
            if (!ValidateData())
            {
                return false;
            }

            TaskItem resultTask = _originalTask ?? new TaskItem();

            resultTask.TaskName = TaskName.Trim();
            resultTask.Notes = Notes?.Trim() ?? string.Empty;

            // Gán các thông tin không đổi
            resultTask.ObjectiveId = ObjectiveId;
            resultTask.ParentTaskId = ParentTaskId;
            if (_originalTask != null)
            {
                // Giữ nguyên trạng thái và tiến độ khi sửa
                resultTask.Status = _originalTask.Status;
                resultTask.Progress = _originalTask.Progress;
            }
            else
            {
                // Trạng thái mặc định khi thêm mới
                resultTask.Status = TaskService.StatusNotStarted;
                resultTask.Progress = 0;
            }


            OnSave?.Invoke(resultTask);
            return true;
        }

        public void Cancel()
        {
            OnCancel?.Invoke();
        }
    }
}
#nullable restore
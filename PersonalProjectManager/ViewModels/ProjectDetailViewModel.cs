#nullable enable
using PersonalProjectManager.Models;
using PersonalProjectManager.Services;
using PersonalProjectManager.DataAccess;
using PersonalProjectManager.Views;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;

namespace PersonalProjectManager.ViewModels
{
    public class ProjectDetailViewModel : ViewModelBase
    {
        // --- Fields ---
        private readonly int _projectId;
        private readonly ProjectService _projectService;
        private readonly ObjectiveService _objectiveService;
        private readonly TaskService _taskService;
        private readonly ObjectiveRepository _objectiveRepository;
        private readonly TaskRepository _taskRepository;
        private readonly MainViewModel? _mainViewModel;

        private Project? _currentProject;
        private Project? _editableProject;
        private readonly ObservableCollection<ObjectiveViewModel> _objectives = new ObservableCollection<ObjectiveViewModel>();
        private object? _selectedTreeViewItem;
        private bool _isLoading = false;
        private bool _isSaving = false;
        private string? _statusMessage;
        private bool _isStatusError = false;

        // --- Properties ---
        public Project? CurrentProject { get => _currentProject; private set => SetProperty(ref _currentProject, value); }
        public Project? EditableProject { get => _editableProject; private set => SetProperty(ref _editableProject, value); }
        public ObservableCollection<ObjectiveViewModel> Objectives => _objectives;
        public bool IsLoading { get => _isLoading; private set => SetProperty(ref _isLoading, value); }
        public bool IsSaving { get => _isSaving; private set => SetProperty(ref _isSaving, value); }
        public string? StatusMessage { get => _statusMessage; private set => SetProperty(ref _statusMessage, value); }
        public bool IsStatusError { get => _isStatusError; private set => SetProperty(ref _isStatusError, value); }
        public bool HasStatusMessage => !string.IsNullOrEmpty(StatusMessage);
        public ObservableCollection<string> AvailableStatuses { get; } = new ObservableCollection<string> { "Đang triển khai", "Đã hoàn thiện", "Tạm dừng" };

        public object? SelectedTreeViewItem
        {
            get => _selectedTreeViewItem;
            set
            {
                if (SetProperty(ref _selectedTreeViewItem, value))
                {
                    Debug.WriteLine($"[ProjectDetailViewModel] Selected TreeView Item changed to: {value?.GetType().Name ?? "null"}");
                    // XÓA BỎ RaiseCanExecuteChanged()
                    // CommandManager sẽ tự cập nhật hoặc gọi nếu cần
                    CommandManager.InvalidateRequerySuggested();
                }
            }
        }

        // --- Commands ---
        public ICommand RefreshDataCommand { get; }
        public ICommand SaveProjectDetailsCommand { get; }
        public ICommand CancelEditProjectDetailsCommand { get; }
        public ICommand AddObjectiveCommand { get; }
        public ICommand AddTaskCommand { get; }
        public ICommand EditObjectiveCommand { get; }
        public ICommand EditTaskCommand { get; }
        public ICommand DeleteObjectiveCommand { get; }
        public ICommand DeleteTaskCommand { get; }
        public ICommand SelectTreeViewItemCommand { get; }


        public ProjectDetailViewModel(int projectId,
                                      ProjectService projectService,
                                      ObjectiveService objectiveService,
                                      TaskService taskService,
                                      ObjectiveRepository objectiveRepository,
                                      TaskRepository taskRepository,
                                      MainViewModel? mainViewModel = null)
        {
            if (projectId <= 0) throw new ArgumentOutOfRangeException(nameof(projectId), "Project ID must be positive.");
            _projectId = projectId;
            _projectService = projectService ?? throw new ArgumentNullException(nameof(projectService));
            _objectiveService = objectiveService ?? throw new ArgumentNullException(nameof(objectiveService));
            _taskService = taskService ?? throw new ArgumentNullException(nameof(taskService));
            _objectiveRepository = objectiveRepository ?? throw new ArgumentNullException(nameof(objectiveRepository));
            _taskRepository = taskRepository ?? throw new ArgumentNullException(nameof(taskRepository));
            _mainViewModel = mainViewModel;

            Debug.WriteLine($"--- ProjectDetailViewModel Initializing for Project ID: {_projectId} ---");

            RefreshDataCommand = new RelayCommand(async _ => await LoadProjectDetailsAsync(), _ => !IsLoading && !IsSaving);
            SaveProjectDetailsCommand = new RelayCommand(async _ => await ExecuteSaveProjectDetailsAsync(), _ => CanExecuteSaveProjectDetails());
            CancelEditProjectDetailsCommand = new RelayCommand(ExecuteCancelEditProjectDetails, _ => CanExecuteCancelEditProjectDetails());
            AddObjectiveCommand = new RelayCommand(async _ => await ExecuteAddObjectiveAsync(), _ => CanExecuteAddObjective());
            AddTaskCommand = new RelayCommand(async _ => await ExecuteAddTaskAsync(), _ => CanExecuteAddTask());
            EditObjectiveCommand = new RelayCommand(async _ => await ExecuteEditObjectiveAsync(), _ => CanExecuteEditObjective());
            EditTaskCommand = new RelayCommand(async _ => await ExecuteEditTaskAsync(), _ => CanExecuteEditTask());
            DeleteObjectiveCommand = new RelayCommand(async _ => await ExecuteDeleteObjectiveAsync(), _ => CanExecuteDeleteObjective());
            DeleteTaskCommand = new RelayCommand(async _ => await ExecuteDeleteTaskAsync(), _ => CanExecuteDeleteTask());
            SelectTreeViewItemCommand = new RelayCommand(ExecuteSelectTreeViewItem);

            _ = LoadProjectDetailsAsync();

            Debug.WriteLine($"--- ProjectDetailViewModel Initialized for Project ID: {_projectId} ---");
        }

        private void ExecuteSelectTreeViewItem(object? selectedItem)
        {
            SelectedTreeViewItem = selectedItem;
        }

        public async Task RequestRefreshAsync()
        {
            if (!IsLoading && !IsSaving)
            {
                await LoadProjectDetailsAsync();
            }
            else
            {
                Debug.WriteLine($"[ProjectDetailViewModel] Refresh request ignored because IsLoading={IsLoading} or IsSaving={IsSaving}.");
            }
        }

        private async Task LoadProjectDetailsAsync()
        {
            if (IsLoading) return;
            IsLoading = true;
            ClearStatusMessage();
            SetStatusMessage("Đang tải dữ liệu dự án...", false);
            Debug.WriteLine($"[ProjectDetailViewModel] Loading details for Project ID: {_projectId}...");

            await SafeDispatchAsync(() => { Objectives.Clear(); SelectedTreeViewItem = null; });

            Project? loadedProject = null;
            List<ObjectiveViewModel> loadedObjectiveVMs = new List<ObjectiveViewModel>();

            try
            {
                loadedProject = await Task.Run(() => _projectService.GetProjectDetails(_projectId));
                if (loadedProject == null) throw new Exception($"Không tìm thấy dự án với ID: {_projectId}.");

                var objectiveModels = await Task.Run(() => _objectiveRepository.GetObjectivesByProjectId(_projectId));
                if (objectiveModels != null)
                {
                    foreach (var objModel in objectiveModels)
                    {
                        var objectiveVM = new ObjectiveViewModel(objModel);
                        var rootTaskVMs = await BuildTaskTreeForObjectiveAsync(objectiveVM);
                        await SafeDispatchAsync(() => { foreach (var taskVM in rootTaskVMs) objectiveVM.Tasks.Add(taskVM); });
                        loadedObjectiveVMs.Add(objectiveVM);
                    }
                }

                await SafeDispatchAsync(() =>
                {
                    CurrentProject = loadedProject;
                    EditableProject = CreateEditableCopy(loadedProject);
                    Objectives.Clear();
                    foreach (var ovm in loadedObjectiveVMs) Objectives.Add(ovm);
                    // Xóa thông báo "Đang tải..." nếu thành công
                    if (StatusMessage == "Đang tải dữ liệu dự án...") ClearStatusMessage();
                    else SetStatusMessage($"Đã tải xong chi tiết dự án '{CurrentProject?.ProjectName}'.", false);
                    Debug.WriteLine($"[ProjectDetailViewModel] Successfully loaded project and {Objectives.Count} objectives with tasks.");
                });
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[ProjectDetailViewModel] !!! ERROR loading project details for ID {_projectId}: {ex}");
                SetStatusMessage($"Lỗi tải dữ liệu dự án: {ex.Message}", true);
                await SafeDispatchAsync(() => { CurrentProject = null; EditableProject = null; Objectives.Clear(); });
            }
            finally
            {
                await SafeDispatchAsync(() => IsLoading = false);
                CommandManager.InvalidateRequerySuggested(); // Cập nhật trạng thái các nút sau khi tải xong
            }
        }

        private Project CreateEditableCopy(Project? source)
        {
            if (source == null) return new Project();
            return new Project { ProjectId = source.ProjectId, ProjectName = source.ProjectName, Owner = source.Owner, StartDate = source.StartDate, EndDate = source.EndDate, Resources = source.Resources, Status = source.Status };
        }

        private async Task<List<TaskViewModel>> BuildTaskTreeForObjectiveAsync(ObjectiveViewModel objectiveVM)
        {
            var rootTaskVMs = new List<TaskViewModel>();
            if (objectiveVM?.ObjectiveModel == null) return rootTaskVMs;
            var rootTaskModels = await Task.Run(() => _taskRepository.GetRootTasksByObjectiveId(objectiveVM.ObjectiveModel.ObjectiveId));
            if (rootTaskModels != null)
            {
                foreach (var taskModel in rootTaskModels)
                {
                    var taskVM = new TaskViewModel(taskModel, _taskService, this);
                    await BuildSubTaskTreeRecursivelyAsync(taskVM);
                    rootTaskVMs.Add(taskVM);
                }
            }
            return rootTaskVMs;
        }

        private async Task BuildSubTaskTreeRecursivelyAsync(TaskViewModel parentTaskVM)
        {
            if (parentTaskVM?.TaskModel == null) return;
            var subTaskModels = await Task.Run(() => _taskRepository.GetSubTasksByParentTaskId(parentTaskVM.TaskModel.TaskId));
            if (subTaskModels != null && subTaskModels.Any())
            {
                var subTaskVMs = new List<TaskViewModel>();
                foreach (var subTaskModel in subTaskModels)
                {
                    var subTaskVM = new TaskViewModel(subTaskModel, _taskService, this);
                    await BuildSubTaskTreeRecursivelyAsync(subTaskVM);
                    subTaskVMs.Add(subTaskVM);
                }
                await SafeDispatchAsync(() => { foreach (var vm in subTaskVMs) parentTaskVM.SubTasks.Add(vm); });
            }
        }

        // --- Logic Save/Cancel Project Details ---
        private bool CanExecuteSaveProjectDetails() => EditableProject != null && !IsSaving && !IsLoading;
        private async Task ExecuteSaveProjectDetailsAsync()
        {
            if (!CanExecuteSaveProjectDetails() || EditableProject == null) return;
            if (string.IsNullOrWhiteSpace(EditableProject.ProjectName)) { SetStatusMessage("Tên dự án không được để trống.", true); return; }
            if (EditableProject.StartDate > EditableProject.EndDate) { SetStatusMessage("Ngày bắt đầu không thể sau ngày kết thúc.", true); return; }

            IsSaving = true; ClearStatusMessage(); SetStatusMessage("Đang lưu thông tin dự án...", false);
            try
            {
                Project projectToSave = CreateEditableCopy(EditableProject);
                bool success = await Task.Run(() => _projectService.UpdateProjectDetails(projectToSave));
                if (success) { await SafeDispatchAsync(() => { CurrentProject = projectToSave; EditableProject = CreateEditableCopy(CurrentProject); SetStatusMessage("Lưu thông tin dự án thành công!", false); }); }
                else { SetStatusMessage("Lưu thông tin dự án thất bại.", true); }
            }
            catch (Exception ex) { Debug.WriteLine($"!!! ERROR saving project details: {ex}"); SetStatusMessage($"Lỗi hệ thống khi lưu: {ex.Message}", true); }
            finally { await SafeDispatchAsync(() => IsSaving = false); }
        }

        private bool CanExecuteCancelEditProjectDetails() => EditableProject != null && CurrentProject != null && !IsSaving && !IsLoading;
        private void ExecuteCancelEditProjectDetails(object? parameter)
        {
            if (CurrentProject == null) return;
            EditableProject = CreateEditableCopy(CurrentProject);
            SetStatusMessage("Đã hủy bỏ thay đổi thông tin dự án.", false); ClearStatusMessage(clearErrorFlag: false);
        }

        // --- Logic Add/Edit/Delete Objectives ---
        private bool CanExecuteAddObjective() => !IsLoading && !IsSaving && CurrentProject != null;
        private async Task ExecuteAddObjectiveAsync()
        {
            if (!CanExecuteAddObjective()) return;

            // SỬA LỖI CS0117 & CS1061: Gán ProjectId cho ViewModel trước khi tạo Window
            var addViewModel = new AddEditObjectiveViewModel();
            addViewModel.ProjectId = CurrentProject!.ProjectId; // Gán ProjectId ở đây

            var dialog = new AddEditObjectiveWindow(addViewModel) { Owner = Application.Current.MainWindow };
            bool? dialogResult = dialog.ShowDialog();

            if (dialogResult == true)
            {
                IsSaving = true; SetStatusMessage("Đang thêm mục tiêu...", false);
                bool added = false;
                try
                {
                    Objective newObjective = new Objective
                    {
                        ProjectId = addViewModel.ProjectId, // Lấy ProjectId từ ViewModel
                        ObjectiveName = addViewModel.ObjectiveName,
                        StartDate = addViewModel.StartDate,
                        EndDate = addViewModel.EndDate,
                        Progress = 0
                    };
                    added = await Task.Run(() => _objectiveService.AddObjective(newObjective));
                    if (added)
                    {
                        SetStatusMessage("Đã thêm mục tiêu thành công. Đang làm mới...", false);
                        await LoadProjectDetailsAsync(); return;
                    }
                    else { SetStatusMessage("Thêm mục tiêu thất bại.", true); }
                }
                catch (Exception ex) { Debug.WriteLine($"!!! ERROR adding objective: {ex}"); SetStatusMessage($"Lỗi khi thêm mục tiêu: {ex.Message}", true); }
                finally { if (!added) await SafeDispatchAsync(() => IsSaving = false); }
            }
        }

        private bool CanExecuteEditObjective() => SelectedTreeViewItem is ObjectiveViewModel && !IsLoading && !IsSaving;
        private async Task ExecuteEditObjectiveAsync()
        {
            if (SelectedTreeViewItem is ObjectiveViewModel selectedObjectiveVM)
            {
                var editViewModel = new AddEditObjectiveViewModel(selectedObjectiveVM.ObjectiveModel);
                var dialog = new AddEditObjectiveWindow(editViewModel) { Owner = Application.Current.MainWindow };
                bool? dialogResult = dialog.ShowDialog();

                if (dialogResult == true)
                {
                    IsSaving = true; SetStatusMessage("Đang cập nhật mục tiêu...", false);
                    bool updated = false;
                    try
                    {
                        Objective objectiveToUpdate = selectedObjectiveVM.ObjectiveModel;
                        objectiveToUpdate.ObjectiveName = editViewModel.ObjectiveName;
                        objectiveToUpdate.StartDate = editViewModel.StartDate;
                        objectiveToUpdate.EndDate = editViewModel.EndDate;

                        updated = await Task.Run(() => _objectiveService.UpdateObjective(objectiveToUpdate));
                        if (updated)
                        {
                            SetStatusMessage("Đã cập nhật mục tiêu. Đang làm mới...", false);
                            await LoadProjectDetailsAsync(); return;
                        }
                        else { SetStatusMessage("Cập nhật mục tiêu thất bại.", true); }
                    }
                    catch (Exception ex) { Debug.WriteLine($"!!! ERROR updating objective ID {selectedObjectiveVM.ObjectiveModel.ObjectiveId}: {ex}"); SetStatusMessage($"Lỗi khi cập nhật mục tiêu: {ex.Message}", true); }
                    finally { if (!updated) await SafeDispatchAsync(() => IsSaving = false); }
                }
            }
        }

        private bool CanExecuteDeleteObjective() => SelectedTreeViewItem is ObjectiveViewModel && !IsLoading && !IsSaving;
        private async Task ExecuteDeleteObjectiveAsync()
        {
            if (SelectedTreeViewItem is ObjectiveViewModel objectiveVM)
            {
                var result = MessageBox.Show($"Bạn chắc chắn muốn xóa mục tiêu '{objectiveVM.ObjectiveName}' và các nhiệm vụ con?", "Xác nhận Xóa", MessageBoxButton.YesNo, MessageBoxImage.Warning);
                if (result == MessageBoxResult.Yes)
                {
                    IsSaving = true; SetStatusMessage("Đang xóa mục tiêu...", false);
                    bool success = false;
                    try
                    {
                        success = await Task.Run(() => _objectiveService.DeleteObjective(objectiveVM.ObjectiveModel.ObjectiveId));
                        if (success) { SetStatusMessage("Đã xóa mục tiêu. Đang làm mới...", false); await LoadProjectDetailsAsync(); return; }
                        else { SetStatusMessage("Xóa mục tiêu thất bại.", true); }
                    }
                    catch (Exception ex) { Debug.WriteLine($"!!! ERROR deleting objective ID {objectiveVM.ObjectiveModel.ObjectiveId}: {ex}"); SetStatusMessage($"Lỗi khi xóa mục tiêu: {ex.Message}", true); }
                    finally { if (!success) await SafeDispatchAsync(() => IsSaving = false); }
                }
            }
        }


        // --- Logic Add/Edit/Delete Tasks ---
        private bool CanExecuteAddTask() => (SelectedTreeViewItem is ObjectiveViewModel || SelectedTreeViewItem is TaskViewModel) && !IsLoading && !IsSaving && CurrentProject != null;
        private async Task ExecuteAddTaskAsync()
        {
            if (!CanExecuteAddTask() || CurrentProject == null) return;

            int objectiveId = 0;
            int? parentTaskId = null;

            if (SelectedTreeViewItem is ObjectiveViewModel selectedObjectiveVM) { objectiveId = selectedObjectiveVM.ObjectiveModel.ObjectiveId; }
            else if (SelectedTreeViewItem is TaskViewModel selectedTaskVM) { objectiveId = selectedTaskVM.TaskModel.ObjectiveId; parentTaskId = selectedTaskVM.TaskModel.TaskId; }
            else { SetStatusMessage("Vui lòng chọn Mục tiêu hoặc Nhiệm vụ cha để thêm nhiệm vụ mới.", true); return; }

            var addViewModel = new AddEditTaskViewModel(objectiveId, parentTaskId);
            var dialog = new AddEditTaskWindow(addViewModel) { Owner = Application.Current.MainWindow };
            bool? dialogResult = dialog.ShowDialog();

            if (dialogResult == true)
            {
                IsSaving = true; SetStatusMessage("Đang thêm nhiệm vụ...", false);
                bool added = false;
                try
                {
                    TaskItem newTask = new TaskItem
                    {
                        ObjectiveId = addViewModel.ObjectiveId,
                        ParentTaskId = addViewModel.ParentTaskId,
                        TaskName = addViewModel.TaskName,
                        Notes = addViewModel.Notes,
                        Status = TaskService.StatusNotStarted,
                        Progress = 0
                    };
                    TaskItem? addedTask = await Task.Run(() => _taskService.AddTask(newTask));
                    added = (addedTask != null);
                    if (added)
                    {
                        SetStatusMessage("Đã thêm nhiệm vụ. Đang làm mới...", false);
                        await LoadProjectDetailsAsync(); return;
                    }
                    else { SetStatusMessage("Thêm nhiệm vụ thất bại.", true); }
                }
                catch (Exception ex) { Debug.WriteLine($"!!! ERROR adding task: {ex}"); SetStatusMessage($"Lỗi khi thêm nhiệm vụ: {ex.Message}", true); }
                finally { if (!added) await SafeDispatchAsync(() => IsSaving = false); }
            }
        }


        private bool CanExecuteEditTask() => SelectedTreeViewItem is TaskViewModel && !IsLoading && !IsSaving;
        private async Task ExecuteEditTaskAsync()
        {
            if (SelectedTreeViewItem is TaskViewModel selectedTaskVM)
            {
                var editViewModel = new AddEditTaskViewModel(selectedTaskVM.TaskModel);
                var dialog = new AddEditTaskWindow(editViewModel) { Owner = Application.Current.MainWindow };
                bool? dialogResult = dialog.ShowDialog();

                if (dialogResult == true)
                {
                    IsSaving = true; SetStatusMessage("Đang cập nhật nhiệm vụ...", false);
                    bool updated = false;
                    try
                    {
                        TaskItem taskToUpdate = selectedTaskVM.TaskModel;
                        taskToUpdate.TaskName = editViewModel.TaskName;
                        taskToUpdate.Notes = editViewModel.Notes;

                        updated = await Task.Run(() => _taskService.UpdateTaskDetails(taskToUpdate));
                        if (updated)
                        {
                            SetStatusMessage("Đã cập nhật nhiệm vụ. Đang làm mới...", false);
                            await LoadProjectDetailsAsync(); return;
                        }
                        else { SetStatusMessage("Cập nhật nhiệm vụ thất bại.", true); }
                    }
                    catch (Exception ex) { Debug.WriteLine($"!!! ERROR updating task ID {selectedTaskVM.TaskModel.TaskId}: {ex}"); SetStatusMessage($"Lỗi khi cập nhật nhiệm vụ: {ex.Message}", true); }
                    finally { if (!updated) await SafeDispatchAsync(() => IsSaving = false); }
                }
            }
        }


        private bool CanExecuteDeleteTask() => SelectedTreeViewItem is TaskViewModel && !IsLoading && !IsSaving;
        private async Task ExecuteDeleteTaskAsync()
        {
            if (SelectedTreeViewItem is TaskViewModel taskVM)
            {
                var result = MessageBox.Show($"Bạn chắc chắn muốn xóa nhiệm vụ '{taskVM.TaskName}' và các nhiệm vụ con?", "Xác nhận Xóa", MessageBoxButton.YesNo, MessageBoxImage.Warning);
                if (result == MessageBoxResult.Yes)
                {
                    IsSaving = true; SetStatusMessage("Đang xóa nhiệm vụ...", false);
                    bool success = false;
                    try
                    {
                        success = await Task.Run(() => _taskService.DeleteTaskAndSubtasks(taskVM.TaskModel.TaskId));
                        if (success) { SetStatusMessage("Đã xóa nhiệm vụ. Đang làm mới...", false); await LoadProjectDetailsAsync(); return; }
                        else { SetStatusMessage("Xóa nhiệm vụ thất bại.", true); }
                    }
                    catch (Exception ex) { Debug.WriteLine($"!!! ERROR deleting task ID {taskVM.TaskModel.TaskId}: {ex}"); SetStatusMessage($"Lỗi khi xóa nhiệm vụ: {ex.Message}", true); }
                    finally { if (!success) await SafeDispatchAsync(() => IsSaving = false); }
                }
            }
        }

        // --- Helper Methods ---
        private void SetStatusMessage(string message, bool isError) { StatusMessage = message; IsStatusError = isError; OnPropertyChanged(nameof(HasStatusMessage)); }
        private void ClearStatusMessage(bool clearErrorFlag = true) { StatusMessage = null; if (clearErrorFlag) IsStatusError = false; OnPropertyChanged(nameof(HasStatusMessage)); }
        private async Task SafeDispatchAsync(Action action)
        {
            Dispatcher? dispatcher = Application.Current?.Dispatcher;
            if (dispatcher != null && !dispatcher.CheckAccess()) { await dispatcher.InvokeAsync(action); }
            else if (dispatcher != null) { try { action(); } catch (Exception ex) { Debug.WriteLine($"[ProjectDetailViewModel.SafeDispatchAsync] Error: {ex.Message}"); } }
            else { Debug.WriteLine("[ProjectDetailViewModel.SafeDispatchAsync] Warning: Dispatcher is null."); }
        }
    }
}
#nullable restore
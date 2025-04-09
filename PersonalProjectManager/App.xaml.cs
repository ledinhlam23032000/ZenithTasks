#nullable enable
using Microsoft.Extensions.DependencyInjection;
using PersonalProjectManager.DataAccess;
using PersonalProjectManager.Services;
using PersonalProjectManager.ViewModels;
using System;
using System.Diagnostics;
using System.IO; // Cần cho IOException
using System.Linq; // Cần cho FirstOrDefault
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading; // Cần cho DispatcherUnhandledExceptionEventArgs

namespace PersonalProjectManager
{
    public partial class App : Application
    {
        public static IServiceProvider? ServiceProvider { get; private set; }

        protected override void OnStartup(StartupEventArgs e)
        {
            Debug.WriteLine("--- Application Starting Up ---");
            SetupGlobalExceptionHandling(); // Thiết lập xử lý lỗi TRƯỚC khi làm bất cứ điều gì khác

            base.OnStartup(e);

            try
            {
                // --- Bước 1: Khởi tạo Database ---
                DatabaseHelper.InitializeDatabase();
                Debug.WriteLine("--- Database initialized successfully ---");

                // --- Bước 2: Cấu hình Dependency Injection Container ---
                var serviceCollection = new ServiceCollection();
                ConfigureServices(serviceCollection); // Gọi hàm cấu hình services

                // Build ServiceProvider
                ServiceProvider = serviceCollection.BuildServiceProvider();
                Debug.WriteLine("--- ServiceProvider built successfully ---");

                // --- Bước 3: Khởi tạo và hiển thị MainWindow ---
                var mainViewModel = ServiceProvider.GetRequiredService<MainViewModel>();
                Debug.WriteLine("--- MainViewModel resolved from ServiceProvider ---");

                var mainWindow = new MainWindow
                {
                    DataContext = mainViewModel
                };
                Debug.WriteLine("--- MainViewModel assigned to MainWindow DataContext ---");

                mainWindow.Show();
                Debug.WriteLine("--- MainWindow shown. Application startup complete ---");
            }
            catch (InvalidOperationException ioEx) when (ioEx.Message.Contains("Database has not been successfully initialized"))
            {
                Debug.WriteLine($"!!! FATAL DATABASE INIT ERROR caught in OnStartup: {ioEx.Message}\n{ioEx.InnerException?.Message}");
                ShowFatalError($"Lỗi nghiêm trọng khi khởi tạo cơ sở dữ liệu:\n\n{ioEx.InnerException?.Message ?? ioEx.Message}\n\nỨng dụng không thể tiếp tục và sẽ đóng.", "Lỗi Cơ sở dữ liệu");
                ShutdownApp(-1);
            }
            catch (Exception ex) // Bắt các lỗi nghiêm trọng khác
            {
                Debug.WriteLine($"!!! FATAL STARTUP ERROR: {ex.Message}\n{ex.StackTrace}");
                ShowFatalError($"Đã xảy ra lỗi nghiêm trọng không mong muốn khi khởi động ứng dụng:\n\n{ex.Message}\n\nỨng dụng sẽ phải đóng.", "Lỗi Khởi Động Nghiêm trọng");
                ShutdownApp(-2);
            }
        }

        private void ConfigureServices(IServiceCollection services)
        {
            Debug.WriteLine("--- Configuring Services for DI ---");

            // Đăng ký Repositories (Singleton)
            services.AddSingleton<ProjectRepository>();
            services.AddSingleton<ObjectiveRepository>();
            services.AddSingleton<TaskRepository>();
            Debug.WriteLine("--- Repositories registered as Singleton ---");

            // Đăng ký Services (Singleton)
            services.AddSingleton<ProjectService>();
            services.AddSingleton<ObjectiveService>();
            services.AddSingleton<TaskService>();
            Debug.WriteLine("--- Services registered as Singleton ---");

            // Đăng ký ViewModels
            services.AddSingleton<MainViewModel>(); // MainViewModel là Singleton
            services.AddTransient<DashboardViewModel>();
            services.AddTransient<CreateProjectViewModel>();
            services.AddTransient<ProjectListViewModel>();
            services.AddTransient<CompletedProjectListViewModel>();
            services.AddTransient<ProgressDashboardViewModel>();
            // ProjectDetailViewModel được tạo thủ công bởi MainViewModel khi cần ProjectId

            // Đăng ký IServiceProvider
            services.AddSingleton<IServiceProvider>(sp => sp);

            Debug.WriteLine("--- ViewModels registered (Main as Singleton, others as Transient) ---");
            Debug.WriteLine("--- Service configuration complete ---");
        }

        private void SetupGlobalExceptionHandling()
        {
            this.DispatcherUnhandledException += App_DispatcherUnhandledException;
            AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;
            TaskScheduler.UnobservedTaskException += TaskScheduler_UnobservedTaskException;
            Debug.WriteLine("--- Global exception handlers set up ---");
        }

        private void App_DispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
        {
            Debug.WriteLine($"!!! UI THREAD UNHANDLED EXCEPTION:\nType: {e.Exception.GetType().Name}\nMessage: {e.Exception.Message}\nStackTrace:\n{e.Exception.StackTrace}");
            ShowError("Đã xảy ra lỗi không mong muốn trong giao diện người dùng. Vui lòng thử lại thao tác hoặc khởi động lại ứng dụng nếu lỗi tiếp diễn.", "Lỗi Giao diện");
            e.Handled = true;
        }

        private void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Exception ex = e.ExceptionObject as Exception ?? new Exception("Unknown background exception");
            Debug.WriteLine($"!!! BACKGROUND THREAD UNHANDLED EXCEPTION (IsTerminating: {e.IsTerminating}):\nType: {ex.GetType().Name}\nMessage: {ex.Message}\nStackTrace:\n{ex.StackTrace}");

            if (!e.IsTerminating)
            {
                Current.Dispatcher?.InvokeAsync(() => // Sử dụng Dispatcher nếu có thể
                {
                    ShowError("Đã xảy ra lỗi ngầm trong ứng dụng. Một số chức năng có thể không hoạt động đúng. Vui lòng lưu công việc và khởi động lại ứng dụng.", "Lỗi Ngầm");
                });
            }
        }

        private void TaskScheduler_UnobservedTaskException(object? sender, UnobservedTaskExceptionEventArgs e)
        {
            Exception? firstException = e.Exception?.InnerExceptions.FirstOrDefault() ?? e.Exception;
            Debug.WriteLine($"!!! UNOBSERVED TASK EXCEPTION:\nType: {firstException?.GetType().Name ?? "N/A"}\nMessage: {firstException?.Message ?? "N/A"}\nStackTrace:\n{firstException?.StackTrace ?? "N/A"}");

            if (e.Exception != null)
            {
                foreach (var innerEx in e.Exception.InnerExceptions)
                {
                    Debug.WriteLine($"--- Inner Exception:\nType: {innerEx.GetType().Name}\nMessage: {innerEx.Message}\nStackTrace:\n{innerEx.StackTrace}");
                }
            }
            e.SetObserved(); // Ngăn crash

            Current.Dispatcher?.InvokeAsync(() => // Sử dụng Dispatcher nếu có thể
            {
                ShowError("Đã xảy ra lỗi không mong muốn trong một tác vụ nền. Vui lòng kiểm tra log để biết chi tiết.", "Lỗi Tác vụ Nền");
            });
        }

        private void ShutdownApp(int exitCode)
        {
            Debug.WriteLine($"--- Shutting down application with exit code: {exitCode} ---");
            Dispatcher? dispatcher = Current?.Dispatcher;
            if (dispatcher != null && dispatcher.CheckAccess())
            {
                Current?.Shutdown(exitCode);
            }
            else if (dispatcher != null)
            {
                dispatcher.Invoke(() => Current?.Shutdown(exitCode));
            }
            else
            {
                Environment.Exit(exitCode);
            }
        }

        private void ShowFatalError(string message, string title)
        {
            Debug.WriteLine($"--- FATAL ERROR: {title} --- {message}");
            Action showErrorAction = () => MessageBox.Show(message, title, MessageBoxButton.OK, MessageBoxImage.Error);
            Dispatcher? dispatcher = Current?.Dispatcher;

            if (dispatcher != null && !dispatcher.CheckAccess())
            {
                dispatcher.Invoke(showErrorAction);
            }
            else
            {
                try { showErrorAction(); } catch { /* Ignore if cannot show */ }
            }
        }

        private void ShowError(string message, string title)
        {
            Debug.WriteLine($"--- ERROR: {title} --- {message}");
            Action showErrorAction = () => MessageBox.Show(message, title, MessageBoxButton.OK, MessageBoxImage.Warning);
            Dispatcher? dispatcher = Current?.Dispatcher;

            if (dispatcher != null && !dispatcher.CheckAccess())
            {
                dispatcher.Invoke(showErrorAction);
            }
            else if (dispatcher != null) // Already on UI thread or dispatcher exists
            {
                try { showErrorAction(); } catch (Exception ex) { Debug.WriteLine($"Error showing MessageBox: {ex.Message}"); }
            }
            else // Dispatcher null
            {
                Debug.WriteLine($"[ShowError] Cannot display MessageBox: {message}");
            }
        }
    }
}
#nullable restore
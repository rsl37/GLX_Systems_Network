using System;
using System.Threading;
using System.Threading.Tasks;
using Resgrid.Model.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Resgrid.Console.Models;

namespace Resgrid.Console.Commands
{
	public sealed class ClearCacheCommand(
		IConfiguration configuration,
		ILogger<ClearCacheCommand> logger,
		ICallsService callsService,
		IUserProfileService userProfileService,
		ICommunicationService communicationService,
		IMessageService messageService,
		IDepartmentSettingsService departmentSettingsService,
		IQueueService queueService,
		IPushService pushService,
		ISubscriptionsService subscriptionsService,
		IScheduledTasksService scheduledTasksService,
		IDepartmentsService departmentsService,
		IActionLogsService actionLogsService,
		ICustomStateService customStateService,
		IUsersService usersService) : ICommandService
	{
		private int DepartmentId => int.Parse(GetConfigurationValue("DepartmentId"));

		/// <summary>
		///     Executes the main functionality of the application.
		/// </summary>
		/// <param name="args">An array of command-line arguments passed to the application.</param>
		/// <param name="cancellationToken">A token that can be used to signal the operation should be canceled.</param>
		/// <returns>Returns an <see cref="ExitCode" /> indicating the result of the execution.</returns>
		public async Task<ExitCode> ExecuteMainAsync(string[] args, CancellationToken cancellationToken)
		{
			logger.LogInformation("Clearing Cache for Department Id " + DepartmentId);
			logger.LogInformation("Please Wait...");

			try
			{
				subscriptionsService.ClearCacheForCurrentPayment(DepartmentId);
				departmentsService.InvalidateDepartmentUsersInCache(DepartmentId);
				departmentsService.InvalidateDepartmentInCache(DepartmentId);
				departmentsService.InvalidatePersonnelNamesInCache(DepartmentId);
				userProfileService.ClearAllUserProfilesFromCache(DepartmentId);
				usersService.ClearCacheForDepartment(DepartmentId);
				actionLogsService.InvalidateActionLogs(DepartmentId);
				customStateService.InvalidateCustomStateInCache(DepartmentId);
				departmentsService.InvalidateDepartmentMembers();

				logger.LogInformation("Completed Clearing Cache");
			}
			catch (Exception ex)
			{
				logger.LogError("Failed to clear Cache");
				logger.LogError(ex.ToString());
				return ExitCode.Failed;
			}

			return ExitCode.Success;
		}

		/// <summary>
		///     Retrieves the value of a specified configuration key.
		/// </summary>
		/// <param name="key">The configuration key whose value needs to be retrieved.</param>
		/// <returns>The value of the specified configuration key.</returns>
		/// <exception cref="InvalidOperationException">Thrown if the configuration key is not specified or the value is empty.</exception>
		private string GetConfigurationValue(string key)
		{
			var value = configuration.GetValue<string>(key);

			if (string.IsNullOrEmpty(value))
				throw new InvalidOperationException(
					$"Configuration key '{key}' not specified or is empty. Please specify a value for '{key}'.");

			return value;
		}
	}
}

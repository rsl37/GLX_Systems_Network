#!/usr/bin/env node

/**
 * GitHub Actions Status Check Utility
 * 
 * This script helps monitor and debug status check updates for GitHub Actions workflows.
 * It's designed to address the issue where "pending" checks don't move to their status
 * sections after completion.
 */

// Dependency validation
let core, github;
try {
  core = require('@actions/core');
  github = require('@actions/github');
} catch (error) {
  console.error('❌ Missing required dependencies. Please install them:');
  console.error('   npm install @actions/core @actions/github');
  console.error(`   Error: ${error.message}`);
  process.exit(1);
}

// Validate dependencies loaded correctly
if (!core || !github) {
  console.error('❌ Dependencies failed to load properly. Check your installation.');
  process.exit(1);
}

/**
 * Safely get input with fallback and validation
 */
function getToken() {
  try {
    return core.getInput('github-token') || process.env.GITHUB_TOKEN;
  } catch (error) {
    console.log('⚠️ Could not read github-token input, trying environment variable');
    return process.env.GITHUB_TOKEN;
  }
}

/**
 * Determine the commit SHA with multiple fallback options
 */
function getCommitSHA(context) {
  const possibleSHAs = [
    context.payload.pull_request?.head?.sha,
    context.payload.after,
    context.payload.head_commit?.id,
    context.sha
  ];

  const sha = possibleSHAs.find(sha => sha && typeof sha === 'string' && sha.length >= 7);

  if (!sha) {
    console.log('🔍 Available context data for SHA detection:');
    console.log('   PR head SHA:', context.payload.pull_request?.head?.sha || 'not available');
    console.log('   After SHA:', context.payload.after || 'not available');
    console.log('   Head commit SHA:', context.payload.head_commit?.id || 'not available');
    console.log('   Context SHA:', context.sha || 'not available');
  }

  return sha;
}

/**
 * Safely make GitHub API calls with retry logic
 */
async function safeApiCall(apiCall, description, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      return { success: true, data: result.data };
    } catch (error) {
      console.log(`⚠️ ${description} failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        return {
          success: false,
          error: error.message,
          status: error.status,
          isRateLimit: error.status === 403 && error.message.includes('rate limit')
        };
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function checkStatusUpdates() {
  try {
    const context = github.context;

    // Validate GitHub Actions context
    if (!context) {
      console.error('❌ No GitHub context available. This script must run in GitHub Actions.');
      return;
    }

    // Validate repository context
    if (!context.repo?.owner || !context.repo?.repo) {
      console.error('❌ Missing repository context. Available context:');
      console.error('   Owner:', context.repo?.owner || 'not available');
      console.error('   Repo:', context.repo?.repo || 'not available');
      console.error('   Event:', context.eventName || 'not available');
      return;
    }

    console.log(`🏃 Running in: ${context.repo.owner}/${context.repo.repo}`);
    console.log(`📋 Event: ${context.eventName}`);

    // Get and validate token
    const token = getToken();
    if (!token) {
      console.error('❌ No GitHub token provided. Set GITHUB_TOKEN environment variable or github-token input.');
      console.error('   This is required to access the GitHub API.');
      return;
    }

    // Validate token format (basic check)
    if (token.length < 20) {
      console.error('❌ GitHub token appears to be invalid (too short). Check your token.');
      return;
    }

    let octokit;
    try {
      octokit = github.getOctokit(token);
    } catch (error) {
      console.error('❌ Failed to initialize GitHub client:', error.message);
      return;
    }

    // Get and validate commit SHA
    const sha = getCommitSHA(context);
    if (!sha) {
      console.error('❌ Could not determine commit SHA from context.');
      console.error('   This script needs a valid commit SHA to check status updates.');
      return;
    }

    console.log(`🔍 Checking status updates for commit: ${sha}`);

    // Get all commit statuses with error handling
    const statusResult = await safeApiCall(
      () => octokit.rest.repos.listCommitStatusesForRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: sha
      }),
      'Fetching commit statuses'
    );

    if (!statusResult.success) {
      console.error('❌ Failed to fetch commit statuses:', statusResult.error);
      if (statusResult.isRateLimit) {
        console.error('   This appears to be a rate limit issue. Try again later.');
      }
      return;
    }

    const statuses = statusResult.data;
    console.log(`📊 Found ${statuses.length} status checks for this commit`);

    if (statuses.length === 0) {
      console.log('ℹ️ No status checks found. This might be normal for:');
      console.log('   • New repositories without CI/CD setup');
      console.log('   • Commits that haven\'t triggered any workflows');
      console.log('   • Draft pull requests (depending on configuration)');
    }

    // Group statuses by context
    const statusByContext = {};
    statuses.forEach(status => {
      if (!status.context) {
        console.log('⚠️ Found status check without context, skipping');
        return;
      }
      if (!statusByContext[status.context]) {
        statusByContext[status.context] = [];
      }
      statusByContext[status.context].push(status);
    });

    // Analyze status updates
    let pendingCount = 0;
    let successCount = 0;
    let failureCount = 0;
    let errorCount = 0;

    Object.entries(statusByContext).forEach(([contextName, contextStatuses]) => {
      if (contextStatuses.length === 0) return;
      
      // Get the latest status for this context
      const latestStatus = contextStatuses[0]; // GitHub returns them in reverse chronological order

      console.log(`\n📋 ${contextName}:`);
      console.log(`   Latest Status: ${latestStatus.state || 'unknown'}`);
      console.log(`   Description: ${latestStatus.description || 'No description'}`);
      console.log(`   Updated: ${latestStatus.updated_at || 'Unknown time'}`);
      
      if (latestStatus.target_url) {
        console.log(`   Details: ${latestStatus.target_url}`);
      }

      // Count status types
      switch (latestStatus.state) {
        case 'pending':
          pendingCount++;
          console.log(`   ⏳ Status is PENDING - may need manual update`);
          break;
        case 'success':
          successCount++;
          console.log(`   ✅ Status is SUCCESS`);
          break;
        case 'failure':
          failureCount++;
          console.log(`   ❌ Status is FAILURE`);
          break;
        case 'error':
          errorCount++;
          console.log(`   💥 Status is ERROR`);
          break;
        default:
          console.log(`   ❓ Unknown status: ${latestStatus.state}`);
      }

      // Check for status update patterns
      if (contextStatuses.length > 1) {
        console.log(`   📈 Status History (${contextStatuses.length} updates):`);
        contextStatuses.slice(0, 5).forEach((status, index) => {
          const timeAgo = status.updated_at ? 
            ` (${new Date(status.updated_at).toLocaleString()})` : '';
          console.log(`     ${index + 1}. ${status.state}${timeAgo}`);
        });
      }
    });

    // Summary report
    console.log(`\n📊 STATUS SUMMARY:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failure: ${failureCount}`);
    console.log(`   💥 Error: ${errorCount}`);
    console.log(`   ⏳ Pending: ${pendingCount}`);

    if (pendingCount > 0) {
      console.log(`\n⚠️  ATTENTION: ${pendingCount} status check(s) are still pending!`);
      console.log(`   This may indicate the issue where pending checks don't update properly.`);
      console.log(`   Consider:`);
      console.log(`   1. Checking if workflows completed successfully`);
      console.log(`   2. Verifying job dependencies are properly configured`);
      console.log(`   3. Ensuring status reporting jobs are running`);
      console.log(`   4. Looking for failed or stuck workflow runs`);
    } else if (pendingCount === 0 && (successCount + failureCount + errorCount) > 0) {
      console.log(`\n🎉 All status checks have been properly updated!`);
    }

    // Check for GitHub Actions runs with error handling
    const runsResult = await safeApiCall(
      () => octokit.rest.actions.listWorkflowRunsForRepo({
        owner: context.repo.owner,
        repo: context.repo.repo,
        head_sha: sha,
        per_page: 50
      }),
      'Fetching workflow runs'
    );

    if (!runsResult.success) {
      console.error('❌ Failed to fetch workflow runs:', runsResult.error);
      console.log('📊 Proceeding with status check analysis only...');
    } else {
      const runs = runsResult.data;
      console.log(`\n🔄 WORKFLOW RUNS FOR THIS COMMIT (${runs.workflow_runs.length}):`);
      
      if (runs.workflow_runs.length === 0) {
        console.log('   No workflow runs found for this commit');
      } else {
        runs.workflow_runs.forEach(run => {
          const status = run.status || 'unknown';
          const conclusion = run.conclusion || (status === 'completed' ? 'unknown' : 'in_progress');
          console.log(`   📋 ${run.name}: ${status} / ${conclusion}`);
          console.log(`     Started: ${run.run_started_at ? new Date(run.run_started_at).toLocaleString() : 'Unknown'}`);
          if (run.conclusion && run.updated_at) {
            console.log(`     Completed: ${new Date(run.updated_at).toLocaleString()}`);
          }
          if (run.html_url) {
            console.log(`     URL: ${run.html_url}`);
          }
        });
      }

      // Set outputs for GitHub Actions
      if (process.env.GITHUB_ACTIONS) {
        try {
          core.setOutput('pending-count', pendingCount.toString());
          core.setOutput('success-count', successCount.toString());
          core.setOutput('failure-count', failureCount.toString());
          core.setOutput('error-count', errorCount.toString());
          core.setOutput('total-workflows', runs.workflow_runs.length.toString());
          core.setOutput('total-status-checks', statuses.length.toString());

          if (pendingCount > 0) {
            core.setOutput('has-pending', 'true');
            core.warning(`${pendingCount} status checks are still pending and may need attention`);
          } else {
            core.setOutput('has-pending', 'false');
          }

          console.log('\n📤 Outputs set for GitHub Actions workflow');
        } catch (outputError) {
          console.log('⚠️ Failed to set GitHub Actions outputs:', outputError.message);
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error in status check utility:', error);
    console.error('Stack trace:', error.stack);

    if (process.env.GITHUB_ACTIONS) {
      try {
        core.setFailed(`Status check utility failed: ${error.message}`);
      } catch (coreError) {
        console.error('❌ Failed to report error to GitHub Actions:', coreError.message);
      }
    }
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  console.log('🚀 Starting GitHub Actions Status Check Utility...');
  checkStatusUpdates()
    .then(() => {
      console.log('✅ Status check utility completed');
    })
    .catch(error => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { checkStatusUpdates };

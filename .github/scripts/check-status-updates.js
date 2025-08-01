/*
 * Copyright © 2025 GALAX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GALAX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */


#!/usr/bin/env node

/**
 * GitHub Actions Status Check Utility
 * 
 * This script helps monitor and debug status check updates for GitHub Actions workflows.
 * It's designed to address the issue where "pending" checks don't move to their status
 * sections after completion.
 */

const core = require('@actions/core');
const github = require('@actions/github');

async function checkStatusUpdates() {
  try {
    const context = github.context;
    const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
    
    if (!token) {
      console.log('⚠️ No GitHub token provided, cannot check status updates');
      return;
    }

    const octokit = github.getOctokit(token);
    
    // Get the current commit SHA
    const sha = context.payload.pull_request?.head?.sha || context.sha;
    console.log(`🔍 Checking status updates for commit: ${sha}`);

    // Get all commit statuses
    const { data: statuses } = await octokit.rest.repos.listCommitStatusesForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: sha
    });

    console.log(`📊 Found ${statuses.length} status checks for this commit:`);
    
    // Group statuses by context
    const statusByContext = {};
    statuses.forEach(status => {
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
      // Get the latest status for this context
      const latestStatus = contextStatuses[0]; // GitHub returns them in reverse chronological order
      
      console.log(`\n📋 ${contextName}:`);
      console.log(`   Latest Status: ${latestStatus.state}`);
      console.log(`   Description: ${latestStatus.description}`);
      console.log(`   Updated: ${latestStatus.updated_at}`);
      
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
      }

      // Check for status update patterns
      if (contextStatuses.length > 1) {
        console.log(`   📈 Status History (${contextStatuses.length} updates):`);
        contextStatuses.slice(0, 3).forEach((status, index) => {
          console.log(`     ${index + 1}. ${status.state} - ${status.updated_at}`);
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
    } else {
      console.log(`\n🎉 All status checks have been properly updated!`);
    }

    // Check for GitHub Actions runs
    const { data: runs } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
      head_sha: sha,
      per_page: 20
    });

    console.log(`\n🔄 WORKFLOW RUNS FOR THIS COMMIT (${runs.workflow_runs.length}):`);
    runs.workflow_runs.forEach(run => {
      console.log(`   ${run.name}: ${run.status} / ${run.conclusion || 'in_progress'}`);
      console.log(`     Started: ${run.run_started_at}`);
      if (run.conclusion) {
        console.log(`     Completed: ${run.updated_at}`);
      }
    });

    // Set outputs for GitHub Actions
    if (process.env.GITHUB_ACTIONS) {
      core.setOutput('pending-count', pendingCount.toString());
      core.setOutput('success-count', successCount.toString());
      core.setOutput('failure-count', failureCount.toString());
      core.setOutput('total-workflows', runs.workflow_runs.length.toString());
      
      if (pendingCount > 0) {
        core.setOutput('has-pending', 'true');
        core.warning(`${pendingCount} status checks are still pending and may need attention`);
      } else {
        core.setOutput('has-pending', 'false');
      }
    }

  } catch (error) {
    console.error('❌ Error checking status updates:', error);
    if (process.env.GITHUB_ACTIONS) {
      core.setFailed(`Status check utility failed: ${error.message}`);
    }
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkStatusUpdates();
}

module.exports = { checkStatusUpdates };
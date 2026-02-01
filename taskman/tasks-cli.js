#!/usr/bin/env node

/**
 * Bridge.dev Task Recommender
 *
 * Reads TASKS.md from the repo root, parses numbered tasks + the
 * "Task Priority & Dependency Chart", and prints colorful
 * recommendations for what to work on next based on:
 *   - Priority (HIGH > MED > LOW)
 *   - Dependencies (only tasks whose deps are all completed)
 *
 * Usage:
 *   From the repo root run:
 *     node tasks-cli.js
 *
 * (Or make it executable: chmod +x tasks-cli.js && ./tasks-cli.js)
 */

const fs = require("fs");
const path = require("path");

// Import all modules
const { colors, bold, colorTaskId, findRepoRoot } = require("./lib/utils");
const {
  parseTasks,
  parsePriorityDeps,
  parsePhases,
  parseArgs,
} = require("./lib/parsers");
const {
  computeProgress,
  computeReadyTasks,
  computePhaseProgress,
  computeStats,
  filterTasks,
  searchTasks,
  findBlockers,
  getInProgressTasks,
} = require("./lib/computations");
const {
  printProgress,
  printHeader,
  printRecommendations,
  printTaskList,
  printTaskDetails,
  printPhaseProgress,
  printBlockers,
  printStats,
  printHelp,
} = require("./lib/display");
const {
  updateTaskStatus,
  updateSubtaskStatus,
  updateProgressSummary,
} = require("./lib/file-ops");

function main() {
  const args = parseArgs();

  // Show help if requested
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const cwd = process.cwd();
  const root = findRepoRoot(cwd);
  const tasksPath = path.join(root, "TASKS.md");

  if (!fs.existsSync(tasksPath)) {
    console.error(
      colors.red +
        `Could not find TASKS.md (looked starting from ${cwd}).` +
        colors.reset,
    );
    process.exit(1);
  }

  // Handle quick actions: --next
  if (args.next) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);
    const meta = parsePriorityDeps(markdown);

    const ready = computeReadyTasks(tasks, meta);
    if (ready.length === 0) {
      console.log(colors.yellow + "No ready tasks available!" + colors.reset);
      console.log(
        colors.gray +
          "All tasks with satisfied dependencies are complete." +
          colors.reset,
      );
      process.exit(0);
    }

    const nextTask = ready[0];
    let updatedMarkdown = updateTaskStatus(
      markdown,
      nextTask.id,
      "in-progress",
      false,
    );
    fs.writeFileSync(tasksPath, updatedMarkdown, "utf8");

    printHeader();
    console.log(
      colors.green +
        `✅ Started task ${colorTaskId(nextTask.id)}!\n` +
        colors.reset,
    );

    const tasks2 = parseTasks(updatedMarkdown);
    const task = tasks2.get(nextTask.id);
    printTaskDetails(nextTask.id, task, nextTask.meta, tasks2);
    return;
  }

  // Handle quick actions: --done
  if (args.done) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);

    const inProgress = getInProgressTasks(tasks);
    if (inProgress.length === 0) {
      console.log(colors.yellow + "No in-progress tasks found!" + colors.reset);
      console.log(
        colors.gray +
          "Use --next to start working on a task first." +
          colors.reset,
      );
      process.exit(0);
    }

    if (inProgress.length > 1) {
      console.log(
        colors.yellow +
          `Multiple in-progress tasks found (${inProgress.length}):\n` +
          colors.reset,
      );
      inProgress.forEach(({ id, task }) => {
        console.log(`  ${colorTaskId(id)}: ${task.title}`);
      });
      console.log(
        `\n${colors.gray}Use --id=${inProgress[0].id} --set-status=done to mark a specific task as done.${colors.reset}`,
      );
      process.exit(0);
    }

    const taskId = inProgress[0].id;
    let updatedMarkdown = updateTaskStatus(markdown, taskId, "done");
    const tasks2 = parseTasks(updatedMarkdown);
    updatedMarkdown = updateProgressSummary(updatedMarkdown, tasks2);
    fs.writeFileSync(tasksPath, updatedMarkdown, "utf8");

    printHeader();
    const task = tasks2.get(taskId);
    console.log(bold("Task Completed Successfully!\n"));
    console.log(
      `  Task ${colors.cyan}${taskId}${colors.reset}: ${bold(task.title)}`,
    );
    console.log(`  Status: ${colors.green}✅ done${colors.reset}\n`);

    const progress = computeProgress(tasks2);
    printProgress(progress);
    return;
  }

  // Handle quick actions: --focus
  if (args.focus !== undefined) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);
    const meta = parsePriorityDeps(markdown);

    const task = tasks.get(args.focus);
    if (!task) {
      console.error(
        colors.red + `Task ${args.focus} not found.` + colors.reset,
      );
      process.exit(1);
    }

    let updatedMarkdown = updateTaskStatus(
      markdown,
      args.focus,
      "in-progress",
      false,
    );
    fs.writeFileSync(tasksPath, updatedMarkdown, "utf8");

    printHeader();
    console.log(
      colors.green +
        `✅ Focused on task ${colorTaskId(args.focus)}!\n` +
        colors.reset,
    );

    const tasks2 = parseTasks(updatedMarkdown);
    const updatedTask = tasks2.get(args.focus);
    const taskMeta = meta.get(args.focus);
    printTaskDetails(args.focus, updatedTask, taskMeta, tasks2);
    return;
  }

  // Handle search
  if (args.search) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);
    const meta = parsePriorityDeps(markdown);

    printHeader();

    const filterOptions = {};
    if (args.filterStatus) {
      filterOptions.status = args.filterStatus;
    }
    if (args.filterPriority) {
      filterOptions.priority = args.filterPriority;
    }

    const results = searchTasks(tasks, meta, args.search, filterOptions);
    printTaskList(results, `Search Results for "${args.search}"`);
    return;
  }

  // Handle phases
  if (args.phases) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);
    const phases = parsePhases(markdown);
    const phaseData = computePhaseProgress(tasks, phases);

    printHeader();
    printPhaseProgress(phaseData);
    return;
  }

  // Handle blockers
  if (args.blockers) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);
    const meta = parsePriorityDeps(markdown);
    const blockerData = findBlockers(tasks, meta);

    printHeader();
    printBlockers(blockerData, tasks);
    return;
  }

  // Handle all-ready
  if (args.allReady) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);
    const meta = parsePriorityDeps(markdown);
    const ready = computeReadyTasks(tasks, meta);

    printHeader();
    printTaskList(ready, "All Ready Tasks");
    return;
  }

  // Handle stats
  if (args.stats) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);
    const meta = parsePriorityDeps(markdown);
    const stats = computeStats(tasks, meta);

    printHeader();
    printStats(stats);
    return;
  }

  // Handle list command
  if (args.list) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);
    const meta = parsePriorityDeps(markdown);

    printHeader();

    const filterOptions = {};
    if (args.filterStatus) {
      filterOptions.status = args.filterStatus;
    }
    if (args.filterPriority) {
      filterOptions.priority = args.filterPriority;
    }
    if (args.filterReady) {
      filterOptions.ready = true;
    }

    const filtered = filterTasks(tasks, meta, filterOptions);

    // Build title based on filters
    let title = "Task List";
    if (args.filterReady) {
      title = "Ready Tasks";
    } else if (args.filterStatus && args.filterPriority) {
      title = `${args.filterPriority} Priority ${args.filterStatus.charAt(0).toUpperCase() + args.filterStatus.slice(1)} Tasks`;
    } else if (args.filterStatus) {
      title = `${args.filterStatus.charAt(0).toUpperCase() + args.filterStatus.slice(1)} Tasks`;
    } else if (args.filterPriority) {
      title = `${args.filterPriority} Priority Tasks`;
    }

    printTaskList(filtered, title);
    return;
  }

  // Handle show task
  if (args.showTask !== undefined) {
    const markdown = fs.readFileSync(tasksPath, "utf8");
    const tasks = parseTasks(markdown);
    const meta = parsePriorityDeps(markdown);

    const task = tasks.get(args.showTask);
    const taskMeta = meta.get(args.showTask);

    printHeader();
    printTaskDetails(args.showTask, task, taskMeta, tasks);

    // Show if task is ready to work on
    if (task && !task.done) {
      const deps = taskMeta?.deps || [];
      const allDepsDone = deps.every((depId) => {
        const dep = tasks.get(depId);
        return dep && dep.done;
      });

      if (allDepsDone && deps.length > 0) {
        console.log(
          colors.green +
            "✅ Ready to work on! All dependencies are satisfied." +
            colors.reset,
        );
      } else if (deps.length > 0) {
        console.log(
          colors.yellow +
            "⏳ Waiting for dependencies to be completed." +
            colors.reset,
        );
      } else {
        console.log(
          colors.cyan + "🚀 Ready to work on! No dependencies." + colors.reset,
        );
      }
    }

    return;
  }

  // Handle subtask status update (only works with single task ID)
  if (
    args.ids &&
    args.ids.length === 1 &&
    args.subtask !== undefined &&
    args.status
  ) {
    const taskId = args.ids[0];
    try {
      let markdown = fs.readFileSync(tasksPath, "utf8");

      // Update subtask status
      const result = updateSubtaskStatus(
        markdown,
        taskId,
        args.subtask,
        args.status,
      );
      markdown = result.markdown;

      // Re-parse to get updated task list
      const tasks = parseTasks(markdown);

      // Update progress summary
      markdown = updateProgressSummary(markdown, tasks);

      // Write back to file
      fs.writeFileSync(tasksPath, markdown, "utf8");

      // Show confirmation
      const statusDisplay =
        args.status === "done"
          ? colors.green + "✅ done" + colors.reset
          : args.status === "in-progress" || args.status === "inprogress"
            ? colors.yellow + "🔄 in progress" + colors.reset
            : colors.gray + "⏳ pending" + colors.reset;

      const task = tasks.get(taskId);
      const taskTitle = task ? task.title : `Task ${taskId}`;

      console.log(bold("Subtask Updated Successfully!\n"));
      console.log(
        `  Task ${colors.cyan}${taskId}${colors.reset}: ${bold(taskTitle)}`,
      );
      console.log(
        `  Subtask ${colors.magenta}${args.subtask}${colors.reset}: ${result.subtaskTitle}`,
      );
      console.log(`  Status: ${statusDisplay}\n`);

      // Show updated progress
      const progress = computeProgress(tasks);
      printProgress(progress);
    } catch (error) {
      console.error(colors.red + "Error: " + error.message + colors.reset);
      process.exit(1);
    }
    return;
  }

  // Handle subtask with multiple IDs - error
  if (args.ids && args.ids.length > 1 && args.subtask !== undefined) {
    console.error(
      colors.red +
        "Error: Subtask updates only work with a single task ID." +
        colors.reset,
    );
    console.error(
      colors.gray +
        "Use --id=N --subtask=M --set-status=STATUS for subtask updates." +
        colors.reset,
    );
    process.exit(1);
  }

  // Handle task status update (supports multiple IDs)
  if (args.ids && args.ids.length > 0 && args.status) {
    try {
      let markdown = fs.readFileSync(tasksPath, "utf8");
      const updatedTasks = [];
      const errors = [];

      // Update each task
      for (const taskId of args.ids) {
        try {
          // Update task status (will also update subtasks if marking as done)
          markdown = updateTaskStatus(markdown, taskId, args.status);
          updatedTasks.push(taskId);
        } catch (err) {
          errors.push({ id: taskId, message: err.message });
        }
      }

      // Re-parse to get updated task list
      const tasks = parseTasks(markdown);

      // Update progress summary
      markdown = updateProgressSummary(markdown, tasks);

      // Write back to file
      fs.writeFileSync(tasksPath, markdown, "utf8");

      // Show confirmation
      const statusDisplay =
        args.status === "done"
          ? colors.green + "✅ done" + colors.reset
          : args.status === "in-progress" || args.status === "inprogress"
            ? colors.yellow + "🔄 in progress" + colors.reset
            : colors.gray + "⏳ pending" + colors.reset;

      if (updatedTasks.length > 0) {
        const isMultiple = updatedTasks.length > 1;
        console.log(
          bold(
            isMultiple
              ? "Tasks Updated Successfully!\n"
              : "Task Updated Successfully!\n",
          ),
        );

        for (const taskId of updatedTasks) {
          const task = tasks.get(taskId);
          const taskTitle = task ? task.title : `Task ${taskId}`;
          console.log(
            `  Task ${colors.cyan}${taskId}${colors.reset}: ${bold(taskTitle)}`,
          );
          console.log(`  Status: ${statusDisplay}`);

          // If marking as done, show that subtasks were also marked
          if (
            args.status === "done" &&
            task &&
            task.subtasks &&
            task.subtasks.length > 0
          ) {
            console.log(
              `  ${colors.gray}(${task.subtasks.length} subtask(s) also marked as done)${colors.reset}`,
            );
          }
          console.log("");
        }
      }

      // Show any errors
      if (errors.length > 0) {
        console.log(
          colors.yellow + "Some tasks could not be updated:\n" + colors.reset,
        );
        for (const err of errors) {
          console.log(
            `  ${colors.red}Task ${err.id}: ${err.message}${colors.reset}`,
          );
        }
        console.log("");
      }

      // Show updated progress
      const progress = computeProgress(tasks);
      printProgress(progress);
    } catch (error) {
      console.error(colors.red + "Error: " + error.message + colors.reset);
      process.exit(1);
    }
    return;
  }

  // Handle update task numbers
  if (args.updateTaskNums) {
    const { updateTaskNumbers } = require("./lib/file-ops");
    const markdown = fs.readFileSync(tasksPath, "utf8");

    printHeader();
    console.log(colors.cyan + "🔄 Renumbering tasks..." + colors.reset);

    const result = updateTaskNumbers(markdown);

    if (result.updated) {
      fs.writeFileSync(tasksPath, result.markdown, "utf8");
      console.log(
        colors.green +
          `✅ Successfully renumbered ${result.finalCount} tasks!` +
          colors.reset,
      );
      console.log(
        colors.gray +
          "All tasks are now sequential starting from 1." +
          colors.reset,
      );
    } else {
      console.log(
        colors.yellow +
          "No renumbering needed. All tasks are already sequential." +
          colors.reset,
      );
    }

    return;
  }

  // Default: show progress and recommendations
  const markdown = fs.readFileSync(tasksPath, "utf8");
  const tasks = parseTasks(markdown);
  const meta = parsePriorityDeps(markdown);

  printHeader();

  if (tasks.size === 0 || meta.size === 0) {
    console.log(
      colors.red +
        "No tasks or priority/dependency metadata found in TASKS.md." +
        colors.reset,
    );
    console.log(
      colors.gray +
        'Ensure tasks are numbered like "- [ ] 23. **Title**" and the chart is present.' +
        colors.reset,
    );
    process.exit(1);
  }

  // Calculate and display progress
  const progress = computeProgress(tasks);
  printProgress(progress);

  const ready = computeReadyTasks(tasks, meta);
  printRecommendations(ready);
}

if (require.main === module) {
  main();
}

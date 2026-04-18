/**
 * Custom Vitest reporter that prints a summary of files with failed tests
 */
export class FailedFilesReporter {
  private ctx: any;

  onInit(ctx: any) {
    this.ctx = ctx;

    // Hook into process exit to print our report
    const originalExit = process.exit;
    let reported = false;

    const printReport = () => {
      if (reported) return;
      reported = true;

      try {
        const files = this.ctx?.state?.getFiles() || [];

        if (files.length === 0) return;

        const failedFiles: Array<{name: string, failCount: number}> = [];

        for (const file of files) {
          const failCount = this.countFailedTests(file);
          if (failCount > 0) {
            failedFiles.push({
              name: file.filepath || file.name,
              failCount
            });
          }
        }

        if (failedFiles.length === 0) return;

        failedFiles.sort((a, b) => a.name.localeCompare(b.name));

        const output: string[] = [];
        output.push('\n' + '='.repeat(80));
        output.push('📋 FILES WITH FAILED TESTS');
        output.push('='.repeat(80));

        failedFiles.forEach((file, index) => {
          const fileName = file.name.split('/').pop() || file.name;
          output.push(`  ${index + 1}. ${fileName} (${file.failCount} failed test${file.failCount > 1 ? 's' : ''})`);
        });

        output.push('='.repeat(80));
        const totalFailed = failedFiles.reduce((sum, f) => sum + f.failCount, 0);
        output.push(`Total: ${failedFiles.length} file(s) with ${totalFailed} failed test(s)\n`);

        process.stderr.write(output.join('\n') + '\n');
      } catch (e) {
        // Silently fail if there's an error
      }
    };

    // Override process.exit to print report before exiting
    process.exit = ((...args: any[]) => {
      printReport();
      return originalExit.apply(process, args as any);
    }) as any;

    // Also hook into beforeExit event
    process.once('beforeExit', printReport);
  }

  onFinished() {
    // Try printing here too in case onFinished is called
    const files = this.ctx?.state?.getFiles() || [];

    if (files.length === 0) {
      return;
    }

    const failedFiles: Array<{name: string, failCount: number}> = [];

    for (const file of files) {
      const failCount = this.countFailedTests(file);
      if (failCount > 0) {
        failedFiles.push({
          name: file.filepath || file.name,
          failCount
        });
      }
    }

    if (failedFiles.length === 0) {
      return;
    }

    failedFiles.sort((a, b) => a.name.localeCompare(b.name));

    const output: string[] = [];
    output.push('\n' + '='.repeat(80));
    output.push('📋 FILES WITH FAILED TESTS');
    output.push('='.repeat(80));

    failedFiles.forEach((file, index) => {
      const fileName = file.name.split('/').pop() || file.name;
      output.push(`  ${index + 1}. ${fileName} (${file.failCount} failed test${file.failCount > 1 ? 's' : ''})`);
    });

    output.push('='.repeat(80));
    const totalFailed = failedFiles.reduce((sum, f) => sum + f.failCount, 0);
    output.push(`Total: ${failedFiles.length} file(s) with ${totalFailed} failed test(s)\n`);

    process.stderr.write(output.join('\n') + '\n');
  }

  /**
   * Count the number of failed tests in a file
   */
  private countFailedTests(file: any): number {
    let count = 0;

    // Recursively count failed tests in tasks
    if (file.tasks && Array.isArray(file.tasks)) {
      for (const task of file.tasks) {
        count += this.countTaskFailures(task);
      }
    }

    return count;
  }

  /**
   * Recursively count failed tests in a task and its children
   */
  private countTaskFailures(task: any): number {
    let count = 0;

    // Count if this task itself failed
    if (task.type === 'test' && task.result?.state === 'fail') {
      count = 1;
    }

    // Recursively count failures in nested tasks
    if (task.tasks && Array.isArray(task.tasks)) {
      for (const nestedTask of task.tasks) {
        count += this.countTaskFailures(nestedTask);
      }
    }

    return count;
  }
}


# Scholarship Finder - Scaling & Deployment

⚠️ **Note**: The scholarship finder is not currently being used. This document is kept for reference only.

**Purpose**: This document outlines deployment strategies, scaling approaches, cost optimization, and monitoring for the scholarship finder system. This information is provided for historical reference and potential future use.

---

## Table of Contents

1. [Job Scheduling](#job-scheduling)
2. [Cost Optimization](#cost-optimization)
3. [Scaling Strategy](#scaling-strategy)
4. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Job Scheduling

⚠️ **Not Currently in Use** - The scholarship finder is not being run on any schedule.

**Goal**: Run the scholarship finder on a schedule without AWS (if it were to be used)

### Option 1: Simple Cron Job (Free, Recommended for Start)

Create `scholarship-finder/scheduler/run_finder.sh`:

```bash
#!/bin/bash

# Scholarship Finder - Cron Job Runner
# Add to crontab: 0 */6 * * * /path/to/run_finder.sh

cd /Users/teial/Tutorials/scholarship-hub/scholarship-finder

# Activate virtual environment
source venv/bin/activate

# Run with logging
python finder_main.py --mode scheduled >> logs/finder_$(date +\%Y\%m\%d).log 2>&1
```

Add to crontab:
```bash
crontab -e

# Add this line (runs every 6 hours):
0 */6 * * * /Users/teial/Tutorials/scholarship-hub/scholarship-finder/scheduler/run_finder.sh
```

### Option 2: Node.js Scheduler (Integrated with API)

Create `api/src/jobs/scholarship-finder.job.ts`:

```typescript
/**
 * Scholarship Finder Job Scheduler
 * Runs Python scholarship finder on a schedule
 */
import { spawn } from 'child_process';
import path from 'path';
import { createFinderJob, updateFinderJob } from '../services/finder-jobs.service';

export class ScholarshipFinderJob {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    const projectRoot = path.resolve(__dirname, '../../../..');
    this.pythonPath = path.join(projectRoot, 'scholarship-finder/venv/bin/python');
    this.scriptPath = path.join(projectRoot, 'scholarship-finder/finder_main.py');
  }

  async runScraper(scraperName: string): Promise<void> {
    console.log(`🔄 Starting scholarship finder: ${scraperName}`);

    // Create job record
    const job = await createFinderJob({
      jobType: 'scraper',
      sourceName: scraperName,
      status: 'pending'
    });

    try {
      // Update to running
      await updateFinderJob(job.id, { status: 'running', startedAt: new Date() });

      // Run Python scraper
      const result = await this.runPythonScript(['--scraper', scraperName]);

      // Update to completed
      await updateFinderJob(job.id, {
        status: 'completed',
        completedAt: new Date(),
        results: result
      });

      console.log(`✅ Scholarship finder completed: ${scraperName}`);
    } catch (error) {
      console.error(`❌ Scholarship finder failed: ${scraperName}`, error);

      await updateFinderJob(job.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });
    }
  }

  private runPythonScript(args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, [this.scriptPath, ...args]);

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
        console.log(data.toString());
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
        console.error(data.toString());
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}: ${error}`));
        } else {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch {
            resolve({ output });
          }
        }
      });
    });
  }
}

// Schedule jobs using node-cron
import cron from 'node-cron';

export function scheduleScholarshipFinder() {
  const finder = new ScholarshipFinderJob();

  // Run general scraper every 6 hours
  cron.schedule('0 */6 * * *', () => {
    finder.runScraper('general');
  });

  // Run AI discovery weekly (Sunday at 2 AM)
  cron.schedule('0 2 * * 0', () => {
    finder.runScraper('ai_discovery');
  });

  // Check expirations daily at 3 AM
  cron.schedule('0 3 * * *', () => {
    finder.runScraper('expiration_check');
  });

  console.log('📅 Scholarship finder jobs scheduled');
}
```

---

## Cost Optimization

⚠️ **Not Currently in Use** - No costs are being incurred as the scholarship finder is not running.

### Free/Low-Cost Options (if it were to be used)

1. **Hosting**: Run on your development machine or a cheap VPS ($5/month)
2. **Database**: Use Supabase free tier (500MB, sufficient for start)
3. **Scheduler**: Cron jobs (free)
4. **APIs**:
   - OpenAI: ~$10-20/month (GPT-3.5-turbo is cheap)
   - Google Custom Search: 100 queries/day free
   - Web scraping: Free (just need good rate limiting)

---

## Scaling Strategy

⚠️ **Not Currently in Use** - The scholarship finder is not running, so no scaling is needed.

### Theoretical Scaling (if it were to be used)

**Start Small** (Months 1-3):
- Run every 6 hours
- Process 2-3 categories
- ~$15/month total cost

**Scale Up** (Months 4-6):
- Move to cloud VPS if needed ($10/month)
- Add more categories
- Run more frequently
- ~$30/month total cost

**Production** (Months 7+):
- Consider managed services if volume increases
- Add monitoring (free tier options available)
- Optimize based on actual usage

---

## Monitoring & Maintenance

⚠️ **Not Currently in Use** - No monitoring or maintenance is needed as the scholarship finder is not running.

### Metrics to Track (if it were to be used)
- Number of scholarships scraped per run
- Number of duplicates detected
- Errors encountered
- Time per source
- Database growth rate

### Alerts (if it were to be used)
- Scraper failed to run
- High error rate (>10%)
- No new scholarships found (potential issue)
- Database connection failures

### Maintenance Tasks (if it were to be used)
- Review and update scraper selectors (websites change)
- Add new sources
- Clean up old raw results (retention policy)
- Optimize performance

---

**Last Updated**: December 2025

import { Cron } from 'croner';

export interface DailyJobOptions {
  /** IANA timezone (e.g. `Asia/Kolkata`). Default: the host's local timezone. */
  timezone?: string;
}

/**
 * Thin wrapper over croner. Owns the daemon's scheduled jobs and tears them
 * down on shutdown. `protect: true` ensures a job never overlaps itself at the
 * scheduler level (the LaneQueue is the second line of defence).
 */
export class Scheduler {
  private readonly jobs: Cron[] = [];

  /** Schedule `onTick` daily at `HH:MM` (24h). Returns the underlying Cron. */
  scheduleDaily(timeHHMM: string, onTick: () => void, options: DailyJobOptions = {}): Cron {
    const [hour, minute] = parseHHMM(timeHHMM);
    const pattern = `${minute} ${hour} * * *`;
    const job = new Cron(pattern, { timezone: options.timezone, protect: true }, onTick);
    this.jobs.push(job);
    return job;
  }

  stop(): void {
    for (const job of this.jobs) job.stop();
    this.jobs.length = 0;
  }
}

function parseHHMM(value: string): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid time "${value}"; expected 24h "HH:MM".`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error(`Invalid time "${value}"; out of range.`);
  return [hour, minute];
}

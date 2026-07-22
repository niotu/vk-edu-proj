type CloseHandler = () => void | Promise<void>;

interface QuestionTimer {
  sessionId: string;
  questionId: string;
  endsAt: Date;
  timeLimitMs: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

const timers = new Map<string, QuestionTimer>();

export function getQuestionEndsAt(sessionId: string): Date | null {
  return timers.get(sessionId)?.endsAt ?? null;
}

export function isQuestionOpen(sessionId: string): boolean {
  const timer = timers.get(sessionId);
  if (!timer) return false;
  return new Date() < timer.endsAt;
}

export function clearQuestionTimer(sessionId: string): void {
  const timer = timers.get(sessionId);
  if (timer) {
    clearTimeout(timer.timeoutId);
    timers.delete(sessionId);
  }
}

export function getQuestionTiming(
  sessionId: string
): { endsAt: Date; timeLimitMs: number } | null {
  const timer = timers.get(sessionId);
  return timer ? { endsAt: timer.endsAt, timeLimitMs: timer.timeLimitMs } : null;
}

export function scheduleQuestionTimer(
  sessionId: string,
  questionId: string,
  endsAt: Date,
  timeLimitMs: number,
  onExpire: CloseHandler
): void {
  clearQuestionTimer(sessionId);
  const delay = Math.max(0, endsAt.getTime() - Date.now());
  const timeoutId = setTimeout(() => {
    timers.delete(sessionId);
    void Promise.resolve(onExpire()).catch((err) => {
      console.error('Question auto-close failed:', err);
    });
  }, delay);

  timers.set(sessionId, { sessionId, questionId, endsAt, timeLimitMs, timeoutId });
}

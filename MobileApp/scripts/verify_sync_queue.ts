/**
 * Sync Queue Logic Verification Script
 */

interface MockQueueItem {
  id: string;
  entityType: string;
  operation: string;
  endpoint: string;
  retryCount: number;
  maxRetries: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'RESOLVED';
  errorMessage?: string;
}

class MockSyncQueue {
  private queue: MockQueueItem[] = [];

  enqueue(item: Omit<MockQueueItem, 'retryCount' | 'maxRetries' | 'status'>) {
    this.queue.push({
      ...item,
      retryCount: 0,
      maxRetries: 5,
      status: 'PENDING',
    });
  }

  getPending() {
    return this.queue.filter(q => q.status === 'PENDING');
  }

  markSuccess(id: string) {
    this.queue = this.queue.filter(q => q.id !== id);
  }

  markFailed(id: string, error: string) {
    const item = this.queue.find(q => q.id === id);
    if (!item) return;
    item.retryCount++;
    if (item.retryCount >= item.maxRetries) {
      item.status = 'FAILED';
    } else {
      item.status = 'PENDING';
    }
    item.errorMessage = error;
  }
}

console.log('=== Running Sync Queue Logic Verification ===');
const q = new MockSyncQueue();

// 1. Enqueue offline expense
q.enqueue({
  id: 'sq_1',
  entityType: 'EXPENSE',
  operation: 'CREATE',
  endpoint: '/groups/grp-1/expenses',
});
console.log('1. Enqueued 1 item. Pending count:', q.getPending().length);
if (q.getPending().length !== 1) process.exit(1);

// 2. Simulate temporary network error (retry backoff)
q.markFailed('sq_1', 'Network timeout (offline)');
console.log('2. After 1 retry failure: retryCount =', q.getPending()[0].retryCount, 'status =', q.getPending()[0].status);
if (q.getPending()[0].retryCount !== 1 || q.getPending()[0].status !== 'PENDING') process.exit(1);

// 3. Simulate online reconnection & success
q.markSuccess('sq_1');
console.log('3. After sync success: remaining pending count:', q.getPending().length);
if (q.getPending().length !== 0) process.exit(1);

console.log('✅ Sync Queue logic passed successfully!\n');

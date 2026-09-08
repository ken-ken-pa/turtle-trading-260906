// ウォッチリストのバッチ処理（最新シグナル取得 / Long Profit集計取得）進捗ポーリングを
// メインスレッドから切り離すためのWeb Worker。
// （既存 public/workers/screeningWorker.js と同一の考え方。タブが非アクティブでも
//  setInterval/setTimeoutのスロットリングを受けずに指定間隔通り処理を継続できる）
//
// メッセージプロトコル:
//   メイン -> Worker: { type: 'start', jobId: string, intervalMs: number }
//                      { type: 'stop' }
//   Worker -> メイン: { type: 'progress', payload: <BatchJob> }
//                      { type: 'error', message: string }

let timerId = null;
let currentJobId = null;
let isProcessing = false;

async function pollOnce(jobId) {
  if (isProcessing) return; // 前回の呼び出しが完了する前に多重発火しないようにする
  isProcessing = true;
  try {
    const res = await fetch('/api/batch/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    const data = await res.json();

    self.postMessage({ type: 'progress', payload: data.job });

    if (data.job && (data.job.status === 'COMPLETED' || data.job.status === 'FAILED')) {
      stopPolling();
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  } finally {
    isProcessing = false;
  }
}

function stopPolling() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  currentJobId = null;
}

self.onmessage = (event) => {
  const { type, jobId, intervalMs } = event.data || {};

  if (type === 'start') {
    stopPolling();
    currentJobId = jobId;
    // 即時に1回実行してから、以後は指定間隔で継続
    pollOnce(jobId);
    timerId = setInterval(() => {
      if (currentJobId) pollOnce(currentJobId);
    }, intervalMs || 1500);
  }

  if (type === 'stop') {
    stopPolling();
  }
};

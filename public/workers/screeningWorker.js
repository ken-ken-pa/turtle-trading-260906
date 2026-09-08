// スクリーニング実行の進捗ポーリングをメインスレッドから切り離すためのWeb Worker
//
// ブラウザのタブが非アクティブになると、メインスレッドの setInterval/setTimeout は
// 1秒間隔への制限やIntensive Throttlingの対象になるが、Web Worker内のタイマーは
// この制限を受けないため、タブを切り替えても指定間隔通りに処理を継続できる（H3の決定事項）。
//
// メッセージプロトコル:
//   メイン -> Worker: { type: 'start', runId: string, intervalMs: number }
//                      { type: 'stop' }
//   Worker -> メイン: { type: 'progress', payload: <APIレスポンスJSON> }
//                      { type: 'error', message: string }

let timerId = null;
let currentRunId = null;
let isProcessing = false;

async function pollOnce(runId) {
  if (isProcessing) return; // 前回の呼び出しが完了する前に多重発火しないようにする
  isProcessing = true;
  try {
    // まずPhase1のバッチ処理を試みる。Phase1が既に完了している場合は
    // process-phase1側が現在の状態をそのまま返すだけなので、
    // 状態を見てPhase2側を呼び分ける。
    let res = await fetch(`/api/screening/runs/${runId}/process-phase1`, {
      method: 'POST',
    });
    let data = await res.json();

    if (data.status === 'PHASE2_RUNNING' || data.status === 'COMPLETED') {
      res = await fetch(`/api/screening/runs/${runId}/process-phase2`, {
        method: 'POST',
      });
      data = await res.json();
    }

    self.postMessage({ type: 'progress', payload: data });

    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
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
  currentRunId = null;
}

self.onmessage = (event) => {
  const { type, runId, intervalMs } = event.data || {};

  if (type === 'start') {
    stopPolling();
    currentRunId = runId;
    // 即時に1回実行してから、以後は指定間隔で継続
    pollOnce(runId);
    timerId = setInterval(() => {
      if (currentRunId) pollOnce(currentRunId);
    }, intervalMs || 2000);
  }

  if (type === 'stop') {
    stopPolling();
  }
};

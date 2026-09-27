import { API_BASE } from "../api/apiClient";

interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

const PROBE_CACHE_MS = 10000;
let lastProbeAt = 0;
let lastProbeResult = false;
let probeInFlight: Promise<boolean> | null = null;

async function canReachSyncServer(): Promise<boolean> {
  if (Date.now() - lastProbeAt < PROBE_CACHE_MS) {
    return lastProbeResult;
  }
  if (probeInFlight) return probeInFlight;

  probeInFlight = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      await fetch(`${API_BASE}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      lastProbeResult = true;
    } catch {
      lastProbeResult = false;
    } finally {
      clearTimeout(timeout);
      lastProbeAt = Date.now();
      probeInFlight = null;
    }
    return lastProbeResult;
  })();

  return probeInFlight;
}

export async function isNetworkAvailable(
  state: NetworkState,
): Promise<boolean> {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === true) return true;
  if (state.isConnected === true && state.isInternetReachable === null)
    return true;

  return canReachSyncServer();
}

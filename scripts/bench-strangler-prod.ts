import "dotenv/config";
import autocannon from "autocannon";

type Latencies = {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
};

type BenchResult = {
  name: string;
  requestsPerSec: number;
  throughputBytesPerSec: number;
  latency: Latencies;
  errors: number;
  timeouts: number;
  non2xx: number;
};

const APP_BASE = process.env.APP_BASE_URL || "http://127.0.0.1:3100";
const RUST_BASE = process.env.RUST_VECTOR_SERVICE_URL || "http://127.0.0.1:8091";
const DURATION_SEC = Number(process.env.BENCH_DURATION_SEC || 15);
const CONNECTIONS = Number(process.env.BENCH_CONNECTIONS || 40);
const PIPELINING = Number(process.env.BENCH_PIPELINING || 1);
const TIMEOUT_SEC = Number(process.env.BENCH_TIMEOUT_SEC || 10);

const payload = {
  student_answer:
    "Đảng lãnh đạo nhân dân thực hiện cách mạng và giành nhiều thắng lợi quan trọng trong công cuộc đổi mới.",
  model_answer:
    "Nhân dân đoàn kết dưới sự lãnh đạo của Đảng để giành độc lập, tự do và phát triển đất nước.",
  use_cache: false
};

async function ensureHealth() {
  const nodeRes = await fetch(`${APP_BASE}/api/vector-similarity?target=node`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_SEC * 1000)
  });

  if (!nodeRes.ok) {
    throw new Error(`Node endpoint not ready: ${nodeRes.status} ${await nodeRes.text()}`);
  }

  const rustRes = await fetch(`${RUST_BASE}/health`, {
    signal: AbortSignal.timeout(TIMEOUT_SEC * 1000)
  });

  if (!rustRes.ok) {
    throw new Error(`Rust service not ready: ${rustRes.status} ${await rustRes.text()}`);
  }
}

function runAutocannon(name: string, url: string): Promise<BenchResult> {
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url,
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      duration: DURATION_SEC,
      connections: CONNECTIONS,
      pipelining: PIPELINING,
      timeout: TIMEOUT_SEC
    });

    instance.on("error", reject);

    instance.on("done", (result) => {
      const getLatencyValue = (key: string, fallback = 0) => {
        const value = (result.latency as Record<string, unknown>)[key];
        return typeof value === "number" ? value : fallback;
      };

      const p50 = getLatencyValue("p50", getLatencyValue("50", getLatencyValue("average", 0)));
      const p95 = getLatencyValue("p95", getLatencyValue("97_5", p50));
      const p99 = getLatencyValue("p99", getLatencyValue("99", p95));
      const avg = getLatencyValue("average", p50);

      resolve({
        name,
        requestsPerSec: result.requests.average,
        throughputBytesPerSec: result.throughput.average,
        latency: {
          avg,
          p50,
          p95,
          p99
        },
        errors: result.errors,
        timeouts: result.timeouts,
        non2xx: result.non2xx
      });
    });
  });
}

function printResult(result: BenchResult) {
  console.log(`\n[${result.name}]`);
  console.log(`  req/s: ${result.requestsPerSec.toFixed(2)}`);
  console.log(`  throughput: ${(result.throughputBytesPerSec / 1024).toFixed(2)} KiB/s`);
  console.log(
    `  latency ms: avg=${result.latency.avg.toFixed(2)} p50=${result.latency.p50.toFixed(2)} p95=${result.latency.p95.toFixed(2)} p99=${result.latency.p99.toFixed(2)}`
  );
  console.log(`  errors=${result.errors} timeouts=${result.timeouts} non2xx=${result.non2xx}`);
}

function pctDiff(base: number, next: number) {
  if (base === 0) return 0;
  return ((next - base) / base) * 100;
}

async function main() {
  console.log("\n=== Strangler Production/Concurrent Benchmark ===");
  console.log(`APP_BASE_URL=${APP_BASE}`);
  console.log(`RUST_VECTOR_SERVICE_URL=${RUST_BASE}`);
  console.log(`DURATION_SEC=${DURATION_SEC} CONNECTIONS=${CONNECTIONS} PIPELINING=${PIPELINING}`);

  console.log("\nPreflight checks...");
  await ensureHealth();
  console.log("Preflight OK");

  const nodeUrl = `${APP_BASE}/api/vector-similarity?target=node`;
  const rustViaNodeUrl = `${APP_BASE}/api/vector-similarity?target=rust`;
  const rustDirectUrl = `${RUST_BASE}/v1/vector-similarity`;

  const node = await runAutocannon("Node baseline", nodeUrl);
  const rustViaNode = await runAutocannon("Rust via Node route", rustViaNodeUrl);
  const rustDirect = await runAutocannon("Rust direct", rustDirectUrl);

  printResult(node);
  printResult(rustViaNode);
  printResult(rustDirect);

  console.log("\n=== Summary ===");
  console.log(`Rust via Node req/s vs Node: ${pctDiff(node.requestsPerSec, rustViaNode.requestsPerSec).toFixed(2)}%`);
  console.log(`Rust via Node p95 vs Node: ${pctDiff(node.latency.p95, rustViaNode.latency.p95).toFixed(2)}%`);
  console.log(`Rust direct req/s vs Node: ${pctDiff(node.requestsPerSec, rustDirect.requestsPerSec).toFixed(2)}%`);
  console.log(`Rust direct p95 vs Node: ${pctDiff(node.latency.p95, rustDirect.latency.p95).toFixed(2)}%`);
}

main().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});

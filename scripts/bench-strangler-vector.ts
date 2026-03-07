import "dotenv/config";

type Target = "node" | "rust";

const APP_BASE = process.env.APP_BASE_URL || "http://127.0.0.1:3100";
const RUST_BASE = process.env.RUST_VECTOR_SERVICE_URL || "http://127.0.0.1:8091";
const ITERATIONS = Number(process.env.BENCH_ITERATIONS || 100);
const TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS || 10000);

const payload = {
  student_answer:
    "Đảng lãnh đạo nhân dân thực hiện cách mạng và giành nhiều thắng lợi quan trọng trong công cuộc đổi mới.",
  model_answer:
    "Nhân dân đoàn kết dưới sự lãnh đạo của Đảng để giành độc lập, tự do và phát triển đất nước.",
  use_cache: false
};

async function ensureHealthy() {
  const appHealth = await fetch(`${APP_BASE}/api/vector-similarity?target=node`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });

  if (!appHealth.ok) {
    const body = await appHealth.text();
    throw new Error(`App endpoint not ready at ${APP_BASE}. Status=${appHealth.status}. Body=${body}`);
  }

  const rustHealth = await fetch(`${RUST_BASE}/health`, {
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!rustHealth.ok) {
    const body = await rustHealth.text();
    throw new Error(`Rust service unhealthy at ${RUST_BASE}/health. Status=${rustHealth.status}. Body=${body}`);
  }
}

async function runNodePath(target: Target) {
  const start = performance.now();

  for (let i = 0; i < ITERATIONS; i += 1) {
    if (i > 0 && i % 25 === 0) {
      console.log(`[${target}] progress: ${i}/${ITERATIONS}`);
    }
    const res = await fetch(`${APP_BASE}/api/vector-similarity?target=${target}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Node route failed for target=${target} (${res.status}): ${body}`);
    }

    await res.json();
  }

  return performance.now() - start;
}

async function runRustDirect() {
  const start = performance.now();

  for (let i = 0; i < ITERATIONS; i += 1) {
    if (i > 0 && i % 25 === 0) {
      console.log(`[rust-direct] progress: ${i}/${ITERATIONS}`);
    }
    const res = await fetch(`${RUST_BASE}/v1/vector-similarity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Rust direct failed (${res.status}): ${body}`);
    }

    await res.json();
  }

  return performance.now() - start;
}

function printResult(name: string, ms: number) {
  const avg = ms / ITERATIONS;
  console.log(`${name}: total=${ms.toFixed(2)}ms avg=${avg.toFixed(2)}ms (${ITERATIONS} req)`);
}

async function main() {
  console.log("\n=== Strangler Vector Benchmark ===");
  console.log(`APP_BASE_URL=${APP_BASE}`);
  console.log(`RUST_VECTOR_SERVICE_URL=${RUST_BASE}`);
  console.log(`ITERATIONS=${ITERATIONS}\n`);
  console.log(`TIMEOUT_MS=${TIMEOUT_MS}\n`);

  console.log("Preflight checks...");
  await ensureHealthy();
  console.log("Preflight OK\n");

  console.log("Running Node baseline...");
  const nodeMs = await runNodePath("node");
  console.log("Running Rust via Node route...");
  const rustViaNodeMs = await runNodePath("rust");
  console.log("Running Rust direct...");
  const rustDirectMs = await runRustDirect();

  printResult("Node (current backend)", nodeMs);
  printResult("Rust via Strangler route", rustViaNodeMs);
  printResult("Rust direct service", rustDirectMs);

  const gainVsNode = ((nodeMs - rustViaNodeMs) / nodeMs) * 100;
  console.log(`\nRust via route improvement vs Node: ${gainVsNode.toFixed(2)}%`);
}

main().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});

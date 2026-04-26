import { spawn } from "child_process";
import path from "path";

interface ProgressData {
  type: string;
  stage: string;
  progress: number;
  message: string;
  detail?: string;
  current_category?: number;
  total_categories?: number;
}

type ProgressCallback = (data: ProgressData) => void;

export async function runRagPipeline(
  filePath: string,
  fileName: string,
  minioObjectName: string,
  enableInference: boolean = false,
  fileHash?: string,
): Promise<any> {
  const { promise } = runRagPipelineWithProgress(
    filePath,
    fileName,
    minioObjectName,
    enableInference,
    () => {},
    fileHash,
  );
  return promise;
}

export function runRagPipelineWithProgress(
  filePath: string,
  fileName: string,
  minioObjectName: string,
  enableInference: boolean = false,
  onProgress: ProgressCallback,
  fileHash?: string,
): { promise: Promise<any>; cancel: () => void } {
  let pythonProcess: ReturnType<typeof spawn> | null = null;
  let cancelled = false;

  const promise = new Promise<any>((resolve, reject) => {
    const backendDir =
      process.env.BACKEND_DIR || path.join(__dirname, "../../../backend");
    const pythonScript = path.join(backendDir, "src/rag_pipeline.py");
    // Use PYTHON_BIN env variable, fallback to system python3
    const pythonBin = process.env.PYTHON_BIN || "python3";

    console.log(`Starting Python RAG pipeline`);
    console.log(`Python: ${pythonBin}`);
    console.log(`Backend dir: ${backendDir}`);
    console.log(`Script: ${pythonScript}`);
    console.log(`File: ${filePath}`);
    console.log(`Original filename: ${fileName}`);
    console.log(`MinIO object: ${minioObjectName}`);
    console.log(`Inference enabled: ${enableInference}`);
    console.log(`File hash: ${fileHash || "not provided"}`);

    const pythonArgs = [
      pythonScript,
      filePath,
      fileName,
      minioObjectName,
      enableInference ? "--enable-inference" : "--no-inference",
    ];

    // Pridáme file hash ak je dostupný
    if (fileHash) {
      pythonArgs.push("--file-hash", fileHash);
    }

    pythonProcess = spawn(pythonBin, pythonArgs, {
      cwd: backendDir,
      // detached: true creates a new process group so we can kill
      // the entire tree (Python + any antiword/libreoffice children)
      detached: true,
      env: {
        ...process.env,
        PYTHONPATH: backendDir,
      },
    });
    // Keep the process referenced so Node doesn't exit early,
    // but don't let an unref'd background run block shutdown.
    pythonProcess.unref();

    let output = "";
    let errorOutput = "";

    if (pythonProcess.stdout) {
      pythonProcess.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;

        // Parse progress messages
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("PROGRESS:")) {
            try {
              const progressJson = line.substring("PROGRESS:".length);
              const progressData: ProgressData = JSON.parse(progressJson);
              onProgress(progressData);
            } catch (e) {
              console.error("Failed to parse progress:", e);
            }
          } else if (line.trim()) {
            console.log("[Python]", line.trim());
          }
        }
      });
    }

    if (pythonProcess.stderr) {
      pythonProcess.stderr.on("data", (data) => {
        const text = data.toString();
        const lines = text
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);

        for (const line of lines) {
          const isInfoLine = /\b-\s*INFO\s*-/i.test(line);
          const isWarningLine = /\b-\s*WARN(?:ING)?\s*-/i.test(line);
          const isErrorLevelLine = /\b-\s*(ERROR|CRITICAL)\s*-/i.test(line);
          const isTracebackLine = /traceback|\bexception\b|\bfatal\b/i.test(
            line,
          );

          const isActualError =
            (isErrorLevelLine || isTracebackLine) &&
            !isInfoLine &&
            !isWarningLine;

          if (isActualError) {
            errorOutput += `${line}\n`;
            console.error("[Python Error]", line);
          } else {
            console.log("[Python]", line);
          }
        }
      });
    }

    pythonProcess.on("close", (code, signal) => {
      if (cancelled) {
        // Intentional kill — resolve quietly so the caller doesn't
        // log a spurious pipeline error.
        resolve({ success: false, cancelled: true });
        return;
      }
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        reject(
          new Error(
            `Python process exited with code ${code} (signal: ${signal})\n${errorOutput}`,
          ),
        );
      }
    });

    pythonProcess.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });

  const cancel = () => {
    if (pythonProcess && !pythonProcess.killed) {
      cancelled = true;
      try {
        // Negative PID kills the entire process group (Python + children)
        process.kill(-pythonProcess.pid!, "SIGTERM");
      } catch {
        // Fallback if group kill fails (e.g. process already gone)
        pythonProcess.kill("SIGTERM");
      }
    }
  };

  return { promise, cancel };
}

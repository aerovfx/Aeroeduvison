/**
 * Document Processing Worker
 * 
 * Background worker for processing documents in queue
 */

import { getBullMQManager } from "@/lib/queue/bullmq"
import { DocumentProcessService } from "./process-service"
import { apiLogger } from "@/lib/logging-simple"

export function createDocumentProcessingWorker() {
  const bullMQ = getBullMQManager()
  
  // Create worker for document processing queue
  const worker = bullMQ.createWorker(
    "document-processing",
    async (job) => {
      const { documentId, userId } = job.data
      
      apiLogger.info("Processing document in queue", {
        metadata: {
          jobId: job.id,
          documentId,
          userId,
        },
      })

      try {
        const result = await DocumentProcessService.processDocument({
          documentId,
          userId,
          skipQueue: true, // Already in queue
        })

        if (!result.success) {
          throw new Error(result.error || "Processing failed")
        }

        return result
      } catch (error: any) {
        apiLogger.error("Document processing job failed", {
          metadata: {
            jobId: job.id,
            documentId,
            error: error.message,
          },
        })
        throw error
      }
    }
  )

  return worker
}

// Auto-create worker if enabled
if (process.env.ENABLE_DOCUMENT_QUEUE === "true") {
  createDocumentProcessingWorker()
  apiLogger.info("Document processing worker started")
}

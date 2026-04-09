export interface SessionResponse {
  session_id: string
  message: string
}

export interface UploadResponse {
  document_id: number
  file_url: string
  status: "uploaded" | "processing" | "done" | "failed"
}

export interface ProcessResponse {
  message: string
  document_id: number
  status: "uploaded" | "processing" | "done" | "failed"
}
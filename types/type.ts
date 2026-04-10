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

export interface PageResponse {
  document_id: number
  page_number: number
  image_url: string | null
  text_content: string | null
  status: "pending" | "processing" | "done" | "failed"

  has_next: boolean
  has_prev: boolean
  next_page: number | null
  prev_page: number | null

  total_pages: number
  document_status: "uploaded" | "processing" | "done" | "failed"
}

export interface ChatResponse {
  message_id: number
  chat_id: number
  status: "processing" | "done" | "failed"
}

export interface ChatRequest {
  document_id: number
  page?: number
  message?: string
  intent?: "question" | "summary" | "highlight" | "generate_questions" | "global_query"
  selected_text?: string
  mode?: "local" | "global"
}

export interface ChatStatusResponse {
  message_id: number
  status: "processing" | "done" | "failed"
  answer: string | null
  error: string | null
}
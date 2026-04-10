

import { SessionResponse, UploadResponse, ProcessResponse, PageResponse, ChatRequest, ChatResponse, ChatStatusResponse } from "@/types/type"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export const initSession = async (): Promise<SessionResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/session/init/`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to initialize session");
  }

  return response.json();
};

export const uploadBook = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE_URL}/api/books/upload/`, {
    method: "POST",
    body: formData,
    credentials: "include", // 🔥 required for cookies
  })

  if (!response.ok) {
    throw new Error("Upload failed")
  }

  return response.json()
}

export const processDocument = async (
  documentId: number
): Promise<ProcessResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/books/process/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // 🔥 required
    body: JSON.stringify({
      document_id: documentId,
    }),
  })

  if (!response.ok) {
    throw new Error("Processing failed")
  }

  return response.json()
}

export const getSessionDocuments = async () => {
  const response = await fetch(`${API_BASE_URL}/api/books/documents/`, {
    method: "GET",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch documents")
  }

  return response.json()
}

export const fetchPageContent = async (
  documentId: number,
  page: number
): Promise<PageResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/page/?document_id=${documentId}&page=${page}`,
    {
      method: "GET",
      credentials: "include", 
    }
  )

  if (!response.ok) {
    throw new Error("Failed to fetch page content")
  }

  return response.json()
}

export const sendChatMessage = async (
  payload: ChatRequest
): Promise<ChatResponse> => {

  const response = await fetch(`${API_BASE_URL}/api/chat/send/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // 🔥 required for session cookie
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error("Chat request failed")
  }

  return response.json()
}

export const getChatStatus = async (
  messageId: number
): Promise<ChatStatusResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/chat/status/${messageId}/`,
    {
      method: "GET",
      credentials: "include", // 🔥 keep session
    }
  )

  if (!response.ok) {
    throw new Error("Failed to fetch chat status")
  }

  return response.json()
}

export const getChatHistory = async (
  documentId: number,
  page?: number,
  intent?: string
): Promise<{ messages: any[] }> => {
  const params = new URLSearchParams({
    document_id: String(documentId),
    ...(page && { page: String(page) }),
    ...(intent && { intent }),
  })

  const response = await fetch(
    `${API_BASE_URL}/api/chat/history/?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to fetch chat history")
  }

  return response.json()
}
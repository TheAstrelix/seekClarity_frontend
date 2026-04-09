

import { SessionResponse, UploadResponse, ProcessResponse } from "@/types/type"

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

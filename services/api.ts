/**
 * API Service Layer
 * Centralized API calls for SeekClarity Book Reader
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================================================
// Type Definitions
// ============================================================================

export interface PageContent {
  pageNumber: number
  text: string
  imageUrl?: string
  highlight?: string
}

export interface BookMetadata {
  bookId: string
  title: string
  totalPages: number
  author?: string
}

export interface UploadResponse {
  bookId: string
  uploadJobId: string
  status: string
}

export interface JobStatus {
  uploadJobId: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  progress: number
  currentPageCount: number
  totalPages: number
  errorMessage?: string
}

export interface AIResponse {
  response: string
  context?: string
  pageNumber?: number
}

export interface SuggestedQuestion {
  id: string
  question: string
  category: 'summary' | 'follow-up' | 'ask'
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Get or create session ID from cookies
 * Returns existing session or creates and stores a new one
 */
export const getOrCreateSessionId = (): string => {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = decodeURIComponent(value || '')
    return acc
  }, {} as Record<string, string>)

  let sessionId = cookies['session_id']
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    document.cookie = `session_id=${encodeURIComponent(sessionId)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
  }
  return sessionId
}

/**
 * Clear session cookie
 */
export const clearSession = (): void => {
  document.cookie = 'session_id=; path=/; max-age=0'
}

// ============================================================================
// Book Upload API
// ============================================================================

/**
 * Upload a book file to the server
 * POST /api/books/upload
 *
 * @param file - The book file (PDF, EPUB, or TXT)
 * @param sessionId - Current session ID
 * @returns Upload response with bookId and uploadJobId
 */
export const uploadBook = async (file: File, sessionId: string): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('session_id', sessionId)

  const response = await fetch(`${API_BASE_URL}/api/books/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(errorData.detail || `Upload failed: ${response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// Book Metadata API
// ============================================================================

/**
 * Fetch book metadata (title, page count, author, etc.)
 * GET /api/books/{bookId}/manifest
 *
 * @param bookId - The book ID
 * @param sessionId - Current session ID
 * @returns Book metadata
 */
export const fetchBookMetadata = async (
  bookId: string,
  sessionId: string
): Promise<BookMetadata> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/manifest?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch book metadata: ${response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// Page Content API
// ============================================================================

/**
 * Fetch a single page content
 * GET /api/books/{bookId}/pages/{pageNumber}
 *
 * @param bookId - The book ID
 * @param pageNumber - The page number to fetch
 * @param sessionId - Current session ID
 * @returns Page content with text and optional image URL
 */
export const fetchPageContent = async (
  bookId: string,
  pageNumber: number,
  sessionId: string
): Promise<PageContent> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/pages/${pageNumber}?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch page ${pageNumber}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch multiple pages at once (for preloading)
 * GET /api/books/{bookId}/pages?start={start}&count={count}
 *
 * @param bookId - The book ID
 * @param startPage - Starting page number
 * @param count - Number of pages to fetch
 * @param sessionId - Current session ID
 * @returns Array of page contents
 */
export const fetchPageBatch = async (
  bookId: string,
  startPage: number,
  count: number,
  sessionId: string
): Promise<PageContent[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/pages?start=${startPage}&count=${count}&session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch pages: ${response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// Upload Job Status API
// ============================================================================

/**
 * Get the status of an upload job
 * GET /api/books/upload/{uploadJobId}/status
 *
 * @param uploadJobId - The upload job ID
 * @param sessionId - Current session ID
 * @returns Job status with progress information
 */
export const fetchUploadJobStatus = async (
  uploadJobId: string,
  sessionId: string
): Promise<JobStatus> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/upload/${uploadJobId}/status?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch job status: ${response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// AI Endpoints
// ============================================================================

/**
 * Get a summary of the current page
 * POST /api/books/{bookId}/ai/summarize
 *
 * @param bookId - The book ID
 * @param pageNumber - The page number to summarize
 * @param sessionId - Current session ID
 * @returns AI-generated summary
 */
export const summarizePage = async (
  bookId: string,
  pageNumber: number,
  sessionId: string
): Promise<AIResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/ai/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber, session_id: sessionId }),
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to summarize page: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get suggested follow-up questions for a page
 * POST /api/books/{bookId}/ai/follow-up-questions
 *
 * @param bookId - The book ID
 * @param pageNumber - The page number
 * @param sessionId - Current session ID
 * @returns Array of suggested questions
 */
export const getFollowUpQuestions = async (
  bookId: string,
  pageNumber: number,
  sessionId: string
): Promise<SuggestedQuestion[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/ai/follow-up-questions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNumber, session_id: sessionId }),
      credentials: 'include',
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get follow-up questions: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Ask a custom question about the current page
 * POST /api/books/{bookId}/ai/ask
 *
 * @param bookId - The book ID
 * @param pageNumber - The page number
 * @param question - The user's question
 * @param sessionId - Current session ID
 * @returns AI response to the question
 */
export const askQuestion = async (
  bookId: string,
  pageNumber: number,
  question: string,
  sessionId: string
): Promise<AIResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber, question, session_id: sessionId }),
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to get AI response: ${response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// Reading Progress API
// ============================================================================

/**
 * Save reading progress for a user
 * POST /api/books/{bookId}/progress
 *
 * @param bookId - The book ID
 * @param pageNumber - Current page number
 * @param sessionId - Current session ID
 */
export const saveReadingProgress = async (
  bookId: string,
  pageNumber: number,
  sessionId: string
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber, session_id: sessionId }),
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to save reading progress: ${response.statusText}`)
  }
}

/**
 * Get user's last reading position
 * GET /api/books/{bookId}/progress
 *
 * @param bookId - The book ID
 * @param sessionId - Current session ID
 * @returns Last read page number
 */
export const getReadingProgress = async (
  bookId: string,
  sessionId: string
): Promise<{ lastPage: number; lastReadAt: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/progress?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) {
    throw new Error(`Failed to get reading progress: ${response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// Annotations/Highlights API
// ============================================================================

/**
 * Create a highlight/annotation on a page
 * POST /api/books/{bookId}/annotations
 *
 * @param bookId - The book ID
 * @param pageNumber - Page number
 * @param text - Text being highlighted
 * @param note - Optional user note
 * @param sessionId - Current session ID
 */
export const createAnnotation = async (
  bookId: string,
  pageNumber: number,
  text: string,
  note: string | null,
  sessionId: string
): Promise<{ annotationId: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber, text, note, session_id: sessionId }),
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to create annotation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get all annotations for a book
 * GET /api/books/{bookId}/annotations
 *
 * @param bookId - The book ID
 * @param sessionId - Current session ID
 */
export const getAnnotations = async (
  bookId: string,
  sessionId: string
): Promise<
  Array<{ pageNumber: number; text: string; note?: string; createdAt: string }>
> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/annotations?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) {
    throw new Error(`Failed to get annotations: ${response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// Library API
// ============================================================================

/**
 * Get all books for the current session
 * GET /api/books
 *
 * @param sessionId - Current session ID
 */
export const getBookLibrary = async (
  sessionId: string
): Promise<
  Array<{
    bookId: string
    title: string
    author?: string
    uploadedAt: string
    lastReadPage: number
  }>
> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) {
    throw new Error(`Failed to get book library: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a book from library
 * DELETE /api/books/{bookId}
 *
 * @param bookId - The book ID
 * @param sessionId - Current session ID
 */
export const deleteBook = async (bookId: string, sessionId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}?session_id=${sessionId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete book: ${response.statusText}`)
  }
}

// ============================================================================
// Error Handling Utility
// ============================================================================

/**
 * Format error message for display
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================================
// Session Management
// ============================================================

export const getOrCreateSessionId = (): string => {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = decodeURIComponent(value || '')
    return acc
  }, {} as Record<string, string>)

  let sessionId = cookies['session_id']
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    document.cookie = `session_id=${encodeURIComponent(sessionId)}; path=/; max-age=${30 * 24 * 60 * 60}`
  }
  return sessionId
}

// ============================================================
// Book Upload API
// ============================================================

export interface UploadResponse {
  bookId: string
  uploadJobId: string
  status: 'pending' | 'processing'
  message: string
}

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

// ============================================================
// Book Metadata API
// ============================================================

export interface BookMetadata {
  bookId: string
  title: string
  totalPages: number
  author?: string
  status?: 'pending' | 'processing' | 'ready' | 'failed'
}

export const fetchBookMetadata = async (bookId: string, sessionId: string): Promise<BookMetadata> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/books/${bookId}/manifest?session_id=${sessionId}`,
      { credentials: 'include' }
    )
    if (!response.ok) throw new Error('Failed to fetch book metadata')
    return await response.json()
  } catch (error) {
    console.warn('Error fetching book metadata:', error)
    throw error
  }
}

// ============================================================
// Page Content API
// ============================================================

export interface PageContent {
  pageNumber: number
  text: string
  imageUrl?: string
  highlight?: string
}

export const fetchPageContent = async (
  bookId: string,
  pageNumber: number,
  sessionId: string
): Promise<PageContent> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/pages/${pageNumber}?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) throw new Error(`Failed to fetch page ${pageNumber}`)
  return await response.json()
}

// ============================================================
// Batch Pages API (for preloading)
// ============================================================

export interface BatchPagesResponse {
  pages: PageContent[]
}

export const fetchBatchPages = async (
  bookId: string,
  startPage: number,
  count: number,
  sessionId: string
): Promise<PageContent[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/pages?start=${startPage}&count=${count}&session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) throw new Error(`Failed to fetch pages ${startPage}-${startPage + count - 1}`)
  const data = await response.json()
  return data.pages || data
}

// ============================================================
// Upload Job Status API
// ============================================================

export interface UploadJobStatus {
  uploadJobId: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  progress: number
  currentPageCount: number
  totalPages: number
  errorMessage?: string
}

export const fetchUploadJobStatus = async (
  uploadJobId: string,
  sessionId: string
): Promise<UploadJobStatus> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/upload/${uploadJobId}/status?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) throw new Error('Failed to fetch job status')
  return await response.json()
}

// ============================================================
// AI Query API
// ============================================================

export interface AIChatRequest {
  bookId: string
  pageNumber: number
  question: string
  mode: 'summary' | 'follow-up' | 'ask'
  sessionId: string
}

export interface AIChatResponse {
  answer: string
  relatedQuestions?: string[]
  sources?: { pageNumber: number; text: string }[]
}

export const queryAI = async (request: AIChatRequest): Promise<AIChatResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/ai/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    credentials: 'include',
  })

  if (!response.ok) throw new Error('AI query failed')
  return await response.json()
}

// ============================================================
// Reading Progress API
// ============================================================

export interface ReadingProgress {
  bookId: string
  currentPage: number
  totalPages: number
  lastReadAt: string
  annotations: number
}

export const saveReadingProgress = async (
  bookId: string,
  currentPage: number,
  sessionId: string
): Promise<ReadingProgress> => {
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPage, sessionId }),
    credentials: 'include',
  })

  if (!response.ok) throw new Error('Failed to save reading progress')
  return await response.json()
}

export const fetchReadingProgress = async (
  bookId: string,
  sessionId: string
): Promise<ReadingProgress> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/progress?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) throw new Error('Failed to fetch reading progress')
  return await response.json()
}

// ============================================================
// Annotations API
// ============================================================

export interface Annotation {
  id: string
  bookId: string
  pageNumber: number
  text: string
  highlightText: string
  type: 'highlight' | 'note' | 'question'
  createdAt: string
}

export const createAnnotation = async (
  bookId: string,
  pageNumber: number,
  highlightText: string,
  type: 'highlight' | 'note' | 'question',
  sessionId: string
): Promise<Annotation> => {
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/annotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pageNumber,
      highlightText,
      type,
      sessionId,
    }),
    credentials: 'include',
  })

  if (!response.ok) throw new Error('Failed to create annotation')
  return await response.json()
}

export const fetchAnnotations = async (
  bookId: string,
  sessionId: string
): Promise<Annotation[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/annotations?session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) throw new Error('Failed to fetch annotations')
  return await response.json()
}

// ============================================================
// Search API
// ============================================================

export interface SearchResult {
  pageNumber: number
  text: string
  highlight: string
}

export const searchBook = async (
  bookId: string,
  query: string,
  sessionId: string
): Promise<SearchResult[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/books/${bookId}/search?q=${encodeURIComponent(query)}&session_id=${sessionId}`,
    { credentials: 'include' }
  )

  if (!response.ok) throw new Error('Search failed')
  const data = await response.json()
  return data.results || []
}

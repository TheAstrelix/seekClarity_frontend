// 'use client'

// import { useEffect, useState, useRef, useCallback } from 'react'
// import { useParams } from 'next/navigation'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import {
//   getOrCreateSessionId,
//   fetchPageContent,
//   fetchPageBatch,
//   fetchBookMetadata,
//   summarizePage,
//   getFollowUpQuestions,
//   askQuestion,
//   saveReadingProgress,
//   type PageContent,
//   type BookMetadata,
//   type AIResponse,
//   type SuggestedQuestion,
// } from '@/services/api'

// interface CacheEntry {
//   data: PageContent
//   timestamp: number
// }

// export default function ReaderPage() {
//   const params = useParams()
//   const bookId = params.bookId as string

//   const [sessionId, setSessionId] = useState<string>('')
//   const [bookMeta, setBookMeta] = useState<BookMetadata | null>(null)
//   const [currentPage, setCurrentPage] = useState(4) // Start at page 4 as example
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [activeTab, setActiveTab] = useState('summary')
//   const [aiResponses, setAiResponses] = useState<Record<string, AIResponse[]>>({
//     summary: [],
//     'follow-up': [],
//     ask: [],
//   })
//   const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([])
//   const [aiLoading, setAiLoading] = useState(false)

//   // LRU Cache: { pageNumber: { data, timestamp } }
//   const cacheRef = useRef<Record<number, CacheEntry>>({})
//   const [displayPage, setDisplayPage] = useState<PageContent | null>(null)

//   // Cache config
//   const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min
//   const PRELOAD_RANGE = 2 // Preload ±2 pages around current

//   // Get or create session ID
//   useEffect(() => {
//     const cookies = document.cookie.split(';').reduce((acc, cookie) => {
//       const [key, value] = cookie.trim().split('=')
//       acc[key] = decodeURIComponent(value || '')
//       return acc
//     }, {} as Record<string, string>)

//     let sid = cookies['session_id']
//     if (!sid) {
//       sid = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
//       document.cookie = `session_id=${encodeURIComponent(sid)}; path=/; max-age=${30 * 24 * 60 * 60}`
//     }
//     setSessionId(sid)
//   }, [])

//   // Fetch book metadata on mount
//   useEffect(() => {
//     if (!sessionId || !bookId) return
//     const loadMeta = async () => {
//       try {
//         const meta = await fetchBookMetadata(bookId, sessionId)
//         setBookMeta(meta)
//       } catch (err) {
//         console.error('Failed to load book metadata:', err)
//       }
//     }
//     loadMeta()
//   }, [bookId, sessionId])

//   // Get page from cache or fetch
//   const getPageContent = useCallback(
//     async (pageNumber: number): Promise<PageContent | null> => {
//       if (pageNumber < 1 || (bookMeta && pageNumber > bookMeta.totalPages)) return null

//       // Check cache (valid if < CACHE_TTL_MS old)
//       const cached = cacheRef.current[pageNumber]
//       if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
//         console.log(`Cache hit: page ${pageNumber}`)
//         return cached.data
//       }

//       // Fetch from backend
//       try {
//         const data = await fetchPageContent(bookId, pageNumber, sessionId)
//         cacheRef.current[pageNumber] = { data, timestamp: Date.now() }
//         return data
//       } catch (err) {
//         console.error(`Error fetching page ${pageNumber}:`, err)
//         return null
//       }
//     },
//     [bookId, sessionId, bookMeta]
//   )

//   // Preload pages in background
//   const preloadPages = useCallback(
//     async (centerPage: number) => {
//       const pagesToPreload: number[] = []
//       for (let i = centerPage - PRELOAD_RANGE; i <= centerPage + PRELOAD_RANGE; i++) {
//         if (i >= 1 && (!bookMeta || i <= bookMeta.totalPages) && !cacheRef.current[i]) {
//           pagesToPreload.push(i)
//         }
//       }

//       // Preload concurrently (but limit to 3 at a time to avoid overwhelming backend)
//       for (let i = 0; i < pagesToPreload.length; i += 3) {
//         const batch = pagesToPreload.slice(i, i + 3)
//         await Promise.all(batch.map(p => getPageContent(p)))
//       }
//     },
//     [bookMeta, getPageContent]
//   )

//   // Load current page + preload adjacent pages
//   useEffect(() => {
//     if (!sessionId || !bookId) return

//     const loadCurrentPage = async () => {
//       setLoading(true)
//       setError(null)
//       try {
//         const page = await getPageContent(currentPage)
//         if (page) {
//           setDisplayPage(page)
//           // Preload surrounding pages in background
//           preloadPages(currentPage)
//         } else {
//           setError(`Failed to load page ${currentPage}`)
//         }
//       } catch (err) {
//         setError(`Error loading page: ${err}`)
//       } finally {
//         setLoading(false)
//       }
//     }

//     loadCurrentPage()
//   }, [currentPage, sessionId, bookId, getPageContent, preloadPages])

//   // Navigation handlers
//   const goToPreviousPage = () => {
//     if (currentPage > 1) setCurrentPage(currentPage - 1)
//   }

//   const goToNextPage = () => {
//     if (!bookMeta || currentPage < bookMeta.totalPages) {
//       setCurrentPage(currentPage + 1)
//     }
//   }

//   const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const page = parseInt(e.target.value, 10)
//     if (!isNaN(page) && page >= 1 && (!bookMeta || page <= bookMeta.totalPages)) {
//       setCurrentPage(page)
//     }
//   }

//   // Calculate progress bar widths
//   const prevPercentage = ((currentPage - 1) / (bookMeta?.totalPages || 180)) * 100
//   const currPercentage = (currentPage / (bookMeta?.totalPages || 180)) * 100

//   // Handle AI summary query
//   const handleSummarizeQuery = useCallback(async () => {
//     if (!bookMeta || !sessionId) return

//     setAiLoading(true)
//     try {
//       const response = await summarizePage(bookId, currentPage, sessionId)
//       setAiResponses(prev => ({
//         ...prev,
//         summary: [...prev.summary, response],
//       }))
//     } catch (err) {
//       console.error('Summary query error:', err)
//     } finally {
//       setAiLoading(false)
//     }
//   }, [bookId, currentPage, sessionId, bookMeta])

//   // Handle follow-up questions query
//   const handleFollowUpQuery = useCallback(async () => {
//     if (!bookMeta || !sessionId) return

//     setAiLoading(true)
//     try {
//       const questions = await getFollowUpQuestions(bookId, currentPage, sessionId)
//       setSuggestedQuestions(questions)
//     } catch (err) {
//       console.error('Follow-up questions error:', err)
//     } finally {
//       setAiLoading(false)
//     }
//   }, [bookId, currentPage, sessionId, bookMeta])

//   // Handle custom question
//   const handleAskQuestion = useCallback(
//     async (question: string) => {
//       if (!bookMeta || !sessionId) return

//       setAiLoading(true)
//       try {
//         const response = await askQuestion(bookId, currentPage, question, sessionId)
//         setAiResponses(prev => ({
//           ...prev,
//           ask: [...prev.ask, response],
//         }))
//       } catch (err) {
//         console.error('Ask question error:', err)
//       } finally {
//         setAiLoading(false)
//       }
//     },
//     [bookId, currentPage, sessionId, bookMeta]
//   )

//   // Save reading progress
//   const handleSaveProgress = useCallback(() => {
//     if (!sessionId) return
//     saveReadingProgress(bookId, currentPage, sessionId).catch(err => {
//       console.error('Failed to save progress:', err)
//     })
//   }, [bookId, currentPage, sessionId])

//   return (
//     <div className="bg-background text-on-background overflow-hidden">
//       {/* Top Navigation Bar */}
//       <header className="bg-[#FAF9F6] dark:bg-[#1A1A1A] flex justify-between items-center w-full px-16 h-16 fixed top-0 z-50 border-b border-surface-container-low/30">
//         <div className="flex items-center gap-8">
//           <span className="text-xl font-semibold tracking-tight text-[#2f3430] dark:text-[#FAF9F6] font-serif">The Living Manuscript</span>
//           <nav className="hidden md:flex gap-6 items-center">
//             <a className="text-[#2f3430] dark:text-white font-bold border-b-2 border-[#5f5e5e] pb-1 font-label text-xs uppercase tracking-widest" href="#">Library</a>
//             <a className="text-[#5f5e5e] dark:text-[#afb3ae] hover:text-[#2f3430] font-label text-xs uppercase tracking-widest transition-colors duration-200" href="#">Annotations</a>
//             <a className="text-[#5f5e5e] dark:text-[#afb3ae] hover:text-[#2f3430] font-label text-xs uppercase tracking-widest transition-colors duration-200" href="#">Archive</a>
//           </nav>
//         </div>
//         <div className="flex items-center gap-4">
//           <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full">
//             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
//             <span className="font-label text-[10px] uppercase tracking-tighter text-on-surface-variant">Session active</span>
//           </div>
//           <button className="font-label text-[10px] uppercase tracking-widest text-outline hover:text-error transition-colors">Clear session</button>
//           <span className="material-symbols-outlined text-[#5f5e5e] cursor-pointer">account_circle</span>
//         </div>
//       </header>

//       <main className="flex h-screen pt-16">
//         {/* Sidebar Navigation */}
//         <aside className="fixed left-0 top-0 h-full flex flex-col py-8 bg-[#f4f4f0] dark:bg-[#121212] w-20 items-center z-40 pt-20">
//           <div className="flex flex-col gap-8">
//             <div className="group flex flex-col items-center gap-1 cursor-pointer">
//               <span className="material-symbols-outlined text-[#2f3430]">menu_book</span>
//               <span className="font-label text-[8px] uppercase tracking-tighter">Reader</span>
//             </div>
//             <div className="group flex flex-col items-center gap-1 cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
//               <span className="material-symbols-outlined text-[#5f5e5e]">auto_awesome</span>
//               <span className="font-label text-[8px] uppercase tracking-tighter">Insights</span>
//             </div>
//             <div className="group flex flex-col items-center gap-1 cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
//               <span className="material-symbols-outlined text-[#5f5e5e]">history</span>
//               <span className="font-label text-[8px] uppercase tracking-tighter">History</span>
//             </div>
//             <div className="group flex flex-col items-center gap-1 cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
//               <span className="material-symbols-outlined text-[#5f5e5e]">settings</span>
//               <span className="font-label text-[8px] uppercase tracking-tighter">Settings</span>
//             </div>
//           </div>
//         </aside>

//         {/* Left Panel: Book Reader (70%) */}
//         <section className="ml-20 w-[calc(70%-5rem)] h-full bg-[#FDFBF7] flex flex-col relative">
//           {/* Reader Header */}
//           <div className="px-16 py-8 flex justify-between items-baseline border-b border-surface-container-low/30">
//             <h1 className="font-headline text-3xl font-light italic text-on-surface">{bookMeta?.title || 'Loading...'}</h1>
//             <span className="font-label text-xs uppercase tracking-[0.2em] text-outline">
//               Page {currentPage} of {bookMeta?.totalPages || '?'}
//             </span>
//           </div>

//           {/* Manuscript Content */}
//           <div className="flex-1 overflow-y-auto px-16 py-12 scroll-smooth">
//             {loading && !displayPage ? (
//               <div className="flex items-center justify-center h-full">
//                 <div className="text-center">
//                   <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">hourglass_empty</span>
//                   <p className="font-label text-on-surface-variant">Loading page {currentPage}...</p>
//                 </div>
//               </div>
//             ) : error ? (
//               <div className="flex items-center justify-center h-full">
//                 <div className="text-center">
//                   <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
//                   <p className="font-label text-error">{error}</p>
//                 </div>
//               </div>
//             ) : displayPage ? (
//               <div className="max-w-2xl mx-auto space-y-8 text-lg leading-relaxed font-serif text-on-surface opacity-90">
//                 {displayPage.highlight ? (
//                   <p className="bg-tertiary-container/60 p-6 rounded-sm relative group transition-all duration-300">
//                     <span className="absolute -left-4 top-0 h-full w-1 bg-tertiary rounded-full opacity-40"></span>
//                     {displayPage.text}
//                   </p>
//                 ) : (
//                   <p>{displayPage.text}</p>
//                 )}
//               </div>
//             ) : null}
//           </div>

//           {/* Reader Footer Controls */}
//           <div className="px-16 h-24 flex items-center justify-between bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7] to-transparent border-t border-surface-container-low/30">
//             <button
//               onClick={goToPreviousPage}
//               disabled={currentPage <= 1}
//               className="flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back_ios</span>
//               <span className="font-label text-xs uppercase tracking-widest font-semibold">Previous</span>
//             </button>

//             {/* Progress Bar */}
//             <div className="flex gap-2 items-center flex-1 mx-8">
//               <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
//                 <div
//                   className="h-full bg-primary rounded-full transition-all duration-300"
//                   style={{ width: `${currPercentage}%` }}
//                 ></div>
//               </div>
//               <input
//                 type="number"
//                 min="1"
//                 max={bookMeta?.totalPages || 180}
//                 value={currentPage}
//                 onChange={handlePageInputChange}
//                 className="w-12 h-8 bg-surface-container-lowest border border-outline-variant rounded px-2 font-label text-xs text-center"
//               />
//             </div>

//             <button
//               onClick={goToNextPage}
//               disabled={bookMeta ? currentPage >= bookMeta.totalPages : false}
//               className="flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               <span className="font-label text-xs uppercase tracking-widest font-semibold">Next</span>
//               <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
//             </button>
//           </div>
//         </section>

//         {/* Right Panel: AI Chat Panel (30%) */}
//         <section className="w-[30%] bg-surface-container-low h-full flex flex-col border-l border-surface-container z-10">
//           {/* AI Header / Context */}
//           <div className="p-6 space-y-4 border-b border-surface-container">
//             <div className="flex items-center gap-2 px-3 py-2 bg-tertiary-fixed rounded-lg border border-tertiary-fixed-dim">
//               <span className="material-symbols-outlined text-tertiary text-sm">auto_awesome</span>
//               <span className="font-label text-[10px] font-bold uppercase tracking-wider text-on-tertiary-container">
//                 Context: Page {currentPage}
//               </span>
//             </div>
//           </div>

//           {/* Tabs Component */}
//           <Tabs
//             value={activeTab}
//             onValueChange={setActiveTab}
//             className="w-full h-full flex flex-col bg-surface-container-low"
//           >
//             <TabsList className="w-full rounded-none border-b border-surface-container bg-surface-container-low p-0 h-auto">
//               <TabsTrigger
//                 value="summary"
//                 className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-label text-[10px] uppercase tracking-widest py-3"
//               >
//                 <span className="material-symbols-outlined text-sm mr-1">description</span>
//                 Summary
//               </TabsTrigger>
//               <TabsTrigger
//                 value="follow-up"
//                 className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-label text-[10px] uppercase tracking-widest py-3"
//               >
//                 <span className="material-symbols-outlined text-sm mr-1">quiz</span>
//                 Follow-up
//               </TabsTrigger>
//               <TabsTrigger
//                 value="ask"
//                 className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-label text-[10px] uppercase tracking-widest py-3"
//               >
//                 <span className="material-symbols-outlined text-sm mr-1">help</span>
//                 Ask
//               </TabsTrigger>
//             </TabsList>

//             {/* Tab: Summary */}
//             <TabsContent value="summary" className="flex-1 flex flex-col overflow-hidden">
//               <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
//                 <div className="flex flex-col items-start max-w-[90%] space-y-2">
//                   <div className="p-4 bg-surface-container-lowest rounded-xl rounded-tl-none shadow-sm">
//                     <p className="font-serif text-base leading-relaxed text-on-surface-variant">
//                       This passage introduces Nick Carraway's philosophy of non-judgment. He reflects on his father's advice about reserving criticism, establishing the narrator's character as someone who observes rather than judges.
//                     </p>
//                   </div>
//                   <span className="font-label text-[9px] uppercase tracking-widest text-outline ml-1">AI Scholar • Just now</span>
//                 </div>

//                 <div className="flex flex-col items-end ml-auto max-w-[90%] space-y-2">
//                   <div className="p-4 bg-primary text-on-primary rounded-xl rounded-tr-none shadow-sm">
//                     <p className="font-label text-sm leading-relaxed">
//                       That's interesting. So Nick is setting himself up as an unreliable observer?
//                     </p>
//                   </div>
//                   <span className="font-label text-[9px] uppercase tracking-widest text-outline mr-1">You • 2 min ago</span>
//                 </div>

//                 <div className="flex flex-col items-start max-w-[90%] space-y-2">
//                   <div className="p-4 bg-surface-container-lowest rounded-xl rounded-tl-none shadow-sm">
//                     <p className="font-serif text-base leading-relaxed text-on-surface-variant">
//                       Exactly! The irony is that by claiming to reserve judgment, he's already judging others. His admission that this "has a limit" foreshadows his inability to maintain objectivity throughout the novel.
//                     </p>
//                   </div>
//                   <span className="font-label text-[9px] uppercase tracking-widest text-outline ml-1">AI Scholar • 1 min ago</span>
//                 </div>
//               </div>

//               <div className="p-6 bg-surface-container-low border-t border-surface-container">
//                 <div className="relative flex items-end gap-2 bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/20 focus-within:border-primary/30 transition-all shadow-sm">
//                   <textarea
//                     className="flex-1 bg-transparent border-none focus:ring-0 font-label text-sm py-2 px-3 resize-none text-on-surface placeholder:text-outline/50"
//                     placeholder="Ask about the summary..."
//                     rows={1}
//                   ></textarea>
//                   <button className="bg-primary text-on-primary p-2 rounded-lg flex items-center justify-center hover:bg-on-surface transition-colors">
//                     <span className="material-symbols-outlined text-lg">send</span>
//                   </button>
//                 </div>
//                 <p className="mt-2 text-center font-label text-[8px] uppercase tracking-[0.2em] text-outline">Summary AI</p>
//               </div>
//             </TabsContent>

//             {/* Tab: Follow-up Questions */}
//             <TabsContent value="follow-up" className="flex-1 flex flex-col overflow-hidden">
//               <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
//                 <div className="p-4 bg-surface-container-highest rounded-lg border border-outline-variant/30">
//                   <p className="font-label text-xs font-semibold text-on-surface mb-3">Suggested Questions:</p>
//                   <div className="space-y-2">
//                     <button className="w-full text-left p-3 bg-surface-container-lowest rounded-lg hover:bg-primary hover:text-on-primary transition-colors font-label text-[10px] leading-relaxed">
//                       <span className="material-symbols-outlined text-sm align-middle mr-2">lightbulb</span>
//                       What does Nick mean by "reserve all judgments"?
//                     </button>
//                     <button className="w-full text-left p-3 bg-surface-container-lowest rounded-lg hover:bg-primary hover:text-on-primary transition-colors font-label text-[10px] leading-relaxed">
//                       <span className="material-symbols-outlined text-sm align-middle mr-2">lightbulb</span>
//                       How does this philosophy fail him later in the novel?
//                     </button>
//                     <button className="w-full text-left p-3 bg-surface-container-lowest rounded-lg hover:bg-primary hover:text-on-primary transition-colors font-label text-[10px] leading-relaxed">
//                       <span className="material-symbols-outlined text-sm align-middle mr-2">lightbulb</span>
//                       Why does Nick mention "the secret griefs of wild, unknown men"?
//                     </button>
//                     <button className="w-full text-left p-3 bg-surface-container-lowest rounded-lg hover:bg-primary hover:text-on-primary transition-colors font-label text-[10px] leading-relaxed">
//                       <span className="material-symbols-outlined text-sm align-middle mr-2">lightbulb</span>
//                       What tone does Fitzgerald use in this opening?
//                     </button>
//                   </div>
//                 </div>

//                 <div className="p-4 bg-tertiary-container/40 rounded-lg border border-tertiary/20">
//                   <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">💡 Pro Tip:</p>
//                   <p className="font-label text-[10px] text-on-surface-variant leading-relaxed">
//                     Click any question above to explore it deeper, or ask your own question in the text field below.
//                   </p>
//                 </div>
//               </div>

//               <div className="p-6 bg-surface-container-low border-t border-surface-container">
//                 <div className="relative flex items-end gap-2 bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/20 focus-within:border-primary/30 transition-all shadow-sm">
//                   <textarea
//                     className="flex-1 bg-transparent border-none focus:ring-0 font-label text-sm py-2 px-3 resize-none text-on-surface placeholder:text-outline/50"
//                     placeholder="Or ask your own question..."
//                     rows={1}
//                   ></textarea>
//                   <button className="bg-primary text-on-primary p-2 rounded-lg flex items-center justify-center hover:bg-on-surface transition-colors">
//                     <span className="material-symbols-outlined text-lg">send</span>
//                   </button>
//                 </div>
//                 <p className="mt-2 text-center font-label text-[8px] uppercase tracking-[0.2em] text-outline">Follow-up Questions AI</p>
//               </div>
//             </TabsContent>

//             {/* Tab: Ask Question */}
//             <TabsContent value="ask" className="flex-1 flex flex-col overflow-hidden">
//               <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
//                 <div className="flex flex-col items-start max-w-[90%] space-y-2">
//                   <div className="p-4 bg-surface-container-lowest rounded-xl rounded-tl-none shadow-sm">
//                     <p className="font-serif text-base leading-relaxed text-on-surface-variant">
//                       I'm ready to help! Ask me anything about this passage, the author, literary techniques, historical context, or how it connects to themes elsewhere in the book. What would you like to explore?
//                     </p>
//                   </div>
//                   <span className="font-label text-[9px] uppercase tracking-widest text-outline ml-1">AI Scholar • Now</span>
//                 </div>

//                 <div className="p-4 bg-surface-container-highest rounded-lg border border-outline-variant/30">
//                   <p className="font-label text-xs font-semibold text-on-surface mb-2">Examples you can ask:</p>
//                   <ul className="space-y-1 font-label text-[10px] text-on-surface-variant">
//                     <li>• "Explain the metaphor in this passage"</li>
//                     <li>• "How does this relate to the American Dream?"</li>
//                     <li>• "What literary devices are used here?"</li>
//                     <li>• "Compare this with another character's viewpoint"</li>
//                   </ul>
//                 </div>
//               </div>

//               <div className="p-6 bg-surface-container-low border-t border-surface-container">
//                 <div className="relative flex items-end gap-2 bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/20 focus-within:border-primary/30 transition-all shadow-sm">
//                   <textarea
//                     className="flex-1 bg-transparent border-none focus:ring-0 font-label text-sm py-2 px-3 resize-none text-on-surface placeholder:text-outline/50"
//                     placeholder="Ask me anything about this passage..."
//                     rows={1}
//                   ></textarea>
//                   <button className="bg-primary text-on-primary p-2 rounded-lg flex items-center justify-center hover:bg-on-surface transition-colors">
//                     <span className="material-symbols-outlined text-lg">send</span>
//                   </button>
//                 </div>
//                 <p className="mt-2 text-center font-label text-[8px] uppercase tracking-[0.2em] text-outline">Ask Anything AI</p>
//               </div>
//             </TabsContent>
//           </Tabs>
//         </section>
//       </main>
//     </div>
//   )
// }

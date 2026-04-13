'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { fetchPageContent, sendChatMessage, getChatStatus, getChatHistory } from '@/services/api'
import type { PageResponse } from '@/types/type'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function ReaderPage() {

  const params = useParams()
  const bookId = Number(params.bookId)

  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<"summary" | "question" | "highlight">("summary")

  const [loading, setLoading] = useState({
    summary: false,
    highlight: false,
    question: false
  })

  const [messages, setMessages] = useState<any>({
    summary: [],
    highlight: [],
    question: []
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [pageData, setPageData] = useState<PageResponse | null>(null)

  // 📄 FETCH PAGE
  useEffect(() => {
    if (!bookId) return

    const load = async () => {
      try {
        const data = await fetchPageContent(bookId, currentPage)
        setPageData(data)
      } catch (err) {
        console.error(err)
      }
    }

    load()
  }, [bookId, currentPage])

  // 🔄 AUTO REFRESH
  useEffect(() => {
    if (pageData?.status === 'processing') {
      const interval = setInterval(async () => {
        const data = await fetchPageContent(bookId, currentPage)
        setPageData(data)
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [pageData, currentPage, bookId])

  // 🔥 RESET ON PAGE CHANGE
  useEffect(() => {
    setMessages({
      summary: [],
      highlight: [],
      question: []
    })
    setActiveTab("summary")
  }, [currentPage])

  // 📜 LOAD CHAT HISTORY
  useEffect(() => {
    const loadHistory = async () => {
      if (!bookId) return

      try {
        const data = await getChatHistory(bookId, currentPage, activeTab)
        
        if (data.messages && data.messages.length > 0) {
          setMessages((prev: any) => ({
            ...prev,
            [activeTab]: data.messages
          }))
        }
      } catch (err) {
        console.error("Failed to load chat history:", err)
      }
    }

    loadHistory()
  }, [bookId, currentPage, activeTab])

  // 🔁 POLLING
  const pollResponse = async (
    messageId: number,
    tab: "summary" | "question" | "highlight"
  ) => {
    try {
      const data = await getChatStatus(messageId)

      if (data.status === "processing") {
        setTimeout(() => pollResponse(messageId, tab), 1000)
        return
      }

      if (data.status === "done") {
        const botMsg = { role: "assistant", content: data.answer || "" }

        setMessages((prev: any) => ({
          ...prev,
          [tab]: [...prev[tab], botMsg]
        }))
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }))
    }
  }

  // 💬 SEND
  const handleSend = async () => {
    if (!input.trim()) return

    const userMsg = { role: "user", content: input }

    setMessages((prev: any) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], userMsg]
    }))

    setLoading((prev) => ({ ...prev, [activeTab]: true }))

    try {
      const res = await sendChatMessage({
        document_id: bookId,
        page: currentPage,
        message: input,
        intent: activeTab,
      })

      pollResponse(res.message_id, activeTab)

    } catch (err) {
      console.error(err)
      setLoading((prev) => ({ ...prev, [activeTab]: false }))
    } finally {
      setInput("")
    }
  }

  // 🔥 AUTO SUMMARY
  const handleTabChange = async (value: string) => {
    const tab = value as "summary" | "question" | "highlight"
    setActiveTab(tab)

    if (tab === "summary" && messages.summary.length === 0) {
      setLoading((prev) => ({ ...prev, summary: true }))

      try {
        const res = await sendChatMessage({
          document_id: bookId,
          page: currentPage,
          intent: "summary"
        })

        pollResponse(res.message_id, "summary")

      } catch (err) {
        console.error(err)
        setLoading((prev) => ({ ...prev, summary: false }))
      }
    }
  }

  const goPrev = () => {
    if (pageData?.has_prev) setCurrentPage(p => p - 1)
  }

  const goNext = () => {
    if (pageData?.has_next) setCurrentPage(p => p + 1)
  }

  return (
    <div className="bg-background text-on-background overflow-hidden">

      <header className="bg-[#FAF9F6] flex justify-between items-center w-full px-16 h-16 fixed top-0 z-50">
        <span className="text-xl font-semibold font-serif">The Living Manuscript</span>

        <span className="text-xs uppercase tracking-widest">
          Page {currentPage} of {pageData?.total_pages || '?'}
        </span>
      </header>

      <main className="flex h-[calc(100vh-4rem)] mt-16">

        {/* LEFT PANEL */}
        <section className="ml-20 w-[70%] bg-[#FDFBF7] flex flex-col">

          <div className="p-8 border-b text-2xl italic">
            Document Viewer
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {pageData?.status === 'processing' && (
              <p>Processing page {currentPage}...</p>
            )}

            {pageData?.status === 'done' && pageData.image_url && (
              <img src={pageData.image_url} className="w-full rounded shadow" />
            )}
          </div>

          <div className="p-6 flex justify-between gap-4">
            <button 
              onClick={goPrev} 
              disabled={!pageData?.has_prev}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                !pageData?.has_prev
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 active:scale-95"
              }`}
            >
              ← Previous
            </button>
            <button 
              onClick={goNext} 
              disabled={!pageData?.has_next}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                !pageData?.has_next
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 active:scale-95"
              }`}
            >
              Next →
            </button>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="w-[30%] bg-[#f4f4f0] flex flex-col border-l">

          <div className="p-4 text-xs uppercase">
            Context: Page {currentPage}
          </div>

          <Tabs defaultValue="summary" onValueChange={handleTabChange} className="flex flex-col h-full">

            <TabsList className="flex gap-2 px-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="highlight">Highlight</TabsTrigger>
              <TabsTrigger value="question">Question</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.summary.length === 0 && !loading.summary && (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <p className="text-lg mb-2">📖</p>
                    <p className="text-xs">No summary yet. Click tab to generate.</p>
                  </div>
                </div>
              )}
              {messages.summary.map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`px-4 py-3 rounded-2xl max-w-xs shadow-md ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none"
                      : "bg-white text-slate-900 rounded-bl-none border border-slate-200"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {loading.summary && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-white border border-slate-200">
                    <div className="flex gap-2 items-center">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.1s"}}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="highlight" className="flex flex-col flex-1 h-full">
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.highlight.length === 0 && !loading.highlight && (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <p className="text-lg mb-2">✨</p>
                      <p className="text-xs">Paste text to highlight key points.</p>
                    </div>
                  </div>
                )}
                {messages.highlight.map((msg: any, i: number) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`px-4 py-3 rounded-2xl max-w-xs shadow-md ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-br-none"
                        : "bg-white text-slate-900 rounded-bl-none border border-slate-200"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                {loading.highlight && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-white border border-slate-200">
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.1s"}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex gap-2 items-end">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Paste text..."
                    className="flex-1 p-3 pl-4 border border-slate-200 rounded-full text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 bg-white transition-all"
                  />
                  <button onClick={handleSend} disabled={loading.highlight} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    loading.highlight ? "bg-slate-100 text-slate-400" : "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:shadow-lg active:scale-95"
                  }`}>
                    ✨ Explain
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="question" className="flex flex-col flex-1 h-full">
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.question.length === 0 && !loading.question && (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <p className="text-lg mb-2">💬</p>
                      <p className="text-xs">Ask a question to get started.</p>
                    </div>
                  </div>
                )}
                {messages.question.map((msg: any, i: number) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`px-4 py-3 rounded-2xl max-w-xs shadow-md ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-br-none"
                        : "bg-white text-slate-900 rounded-bl-none border border-slate-200"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                {loading.question && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-white border border-slate-200">
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.1s"}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex gap-2 items-end">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask your question..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    className="flex-1 p-3 pl-4 border border-slate-200 rounded-full text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-all"
                  />
                  <button onClick={handleSend} disabled={loading.question} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    loading.question ? "bg-slate-100 text-slate-400" : "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-lg active:scale-95"
                  }`}>
                    💬 Send
                  </button>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </section>
      </main>
    </div>
  )
}
'use client'

import { useState, useRef, useEffect } from "react"
import { sendChatMessage, getChatStatus } from "@/services/api"
import { Send, Loader } from "lucide-react"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"

interface Props {
  documentId: number
  currentPage: number
  intent: "question" | "summary" | "highlight"
}

export default function ChatPanel({ documentId, currentPage, intent }: Props) {

  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([])

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const pollResponse = async (messageId: number) => {
    try {
      const data = await getChatStatus(messageId)

      if (data.status === "processing") {
        setTimeout(() => pollResponse(messageId), 1000)
        return
      }

      if (data.status === "done") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer || "" }
        ])
      }

      if (data.status === "failed") {
        console.error(data.error)
      }

    } catch (err) {
      console.error("Polling error", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ])

    setInput("")
    setLoading(true)

    try {
      const res = await sendChatMessage({
        document_id: documentId,
        page: currentPage,
        message: userMessage,
        intent: intent,
      })

      pollResponse(res.message_id)

    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-white">

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h3 className="text-sm font-semibold text-slate-800 capitalize">
          {intent === "question" ? "💬 Ask Questions" : 
           intent === "summary" ? "📋 Summary" : 
           "✨ Highlights"}
        </h3>
        <p className="text-xs text-slate-500 mt-1">Page {currentPage}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="text-3xl mb-2">
                {intent === "question" ? "💭" : 
                 intent === "summary" ? "📖" : 
                 "⭐"}
              </div>
              <p className="text-xs">
                {intent === "question" ? "Ask a question to get started" : 
                 intent === "summary" ? "Get a summary of this page" : 
                 "Highlight key points"}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-2`}
          >
            {/* USER */}
            {msg.role === "user" ? (
              <div className="flex items-end gap-2 max-w-xs">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative px-5 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl rounded-tr-sm shadow-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* ASSISTANT */
              <div className="flex items-start gap-2 max-w-sm">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-50 rounded-3xl blur-md opacity-20"></div>

                  {/* 🔥 UPDATED MARKDOWN RENDER */}
                  <div className="relative px-5 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-3xl rounded-tl-sm shadow-md">
                    <div className="text-sm leading-relaxed">
                      <ReactMarkdown
                        rehypePlugins={[rehypeSanitize]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-blue-700" {...props} />,
                          em: ({ node, ...props }) => <em className="italic" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
                          hr: () => null, // Hide horizontal rules
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-slate-100 border border-slate-200">
              <div className="flex gap-2 items-center">
                <Loader className="w-4 h-4 text-slate-500 animate-spin" />
                <span className="text-xs text-slate-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <input
              className="w-full p-3 pl-4 pr-4 border border-slate-200 rounded-full text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50"
              placeholder={
                intent === "question" ? "Ask anything..." : 
                intent === "summary" ? "Ask about the summary..." : 
                "Ask about highlights..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={`p-2.5 rounded-full ${
              loading || !input.trim()
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
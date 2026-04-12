'use client'

import { useState, useRef, useEffect } from "react"
import { sendChatMessage, getChatStatus } from "@/services/api"
import { Send, Loader } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Props {
  documentId: number
  currentPage: number
  intent: "question" | "summary" | "highlight"
}

// 🔥 Markdown sanitizer (VERY IMPORTANT)
const ensureMarkdown = (text: string): string => {
  return text
    .replace(/\\\*/g, "*")     // fix escaped **
    .replace(/\\_/g, "_")      // fix escaped _
    .replace(/\\n/g, "\n")     // fix newlines
    .replace(/\r/g, "")
    .trim()
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

  // 🔁 Poll response
  const pollResponse = async (messageId: number) => {
    try {
      const data = await getChatStatus(messageId)

      if (data.status === "processing") {
        setTimeout(() => pollResponse(messageId), 1000)
        return
      }

      if (data.status === "done") {
        const content = ensureMarkdown(data.answer || "")

        console.log("🎯 Cleaned response:", content)

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content }
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

  // 📤 Send message
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
          <div className="h-full flex items-center justify-center text-center text-slate-400">
            <div>
              <div className="text-3xl mb-2">
                {intent === "question" ? "💭" : 
                 intent === "summary" ? "📖" : "⭐"}
              </div>
              <p className="text-xs">
                {intent === "question"
                  ? "Ask a question to get started"
                  : intent === "summary"
                  ? "Get a summary of this page"
                  : "Highlight key points"}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              // USER
              <div className="max-w-xs">
                <div className="px-5 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl rounded-tr-sm shadow-lg text-sm whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ) : (
              // ASSISTANT
              <div className="max-w-sm">
                <div className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-3xl rounded-tl-sm shadow-md">
                  
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: (props) => <p className="mb-2" {...props} />,
                        strong: (props) => <strong className="font-bold text-blue-600" {...props} />,
                        em: (props) => <em className="italic text-slate-700" {...props} />,
                        ul: (props) => <ul className="list-disc list-inside mb-2" {...props} />,
                        ol: (props) => <ol className="list-decimal list-inside mb-2" {...props} />,
                        li: (props) => <li className="mb-1" {...props} />,
                        code: ({ children, ...props }: any) => {
                          const text = String(children)
                          const isInline = !text.includes("\n")

                          return isInline ? (
                            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-xs" {...props}>
                              {text}
                            </code>
                          ) : (
                            <code className="block bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto font-mono text-xs mb-2" {...props}>
                              {text}
                            </code>
                          )
                        },
                        pre: (props) => <pre className="mb-2 overflow-x-auto" {...props} />,
                        blockquote: (props) => (
                          <blockquote className="border-l-4 border-slate-300 pl-4 py-2 italic text-slate-600 mb-2" {...props} />
                        ),
                        h1: (props) => <h1 className="text-lg font-bold mb-2" {...props} />,
                        h2: (props) => <h2 className="text-base font-bold mb-2" {...props} />,
                        h3: (props) => <h3 className="text-sm font-bold mb-2" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 flex gap-2 items-center">
              <Loader className="w-4 h-4 text-slate-500 animate-spin" />
              <span className="text-xs text-slate-500">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            className="flex-1 p-3 border border-slate-200 rounded-full text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={loading}
          />

          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
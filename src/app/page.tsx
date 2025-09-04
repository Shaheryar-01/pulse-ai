'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm Pulse AI, your Avanza internal assistant. How can I help you today?",
      timestamp: new Date().toISOString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<any[]>([])
  
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  
  const webhookUrl = 'https://26450f575c4a.ngrok-free.app/webhook/avanza-hr-chat'

  const scrollToLastMessage = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }

  useEffect(() => {
    setTimeout(scrollToLastMessage, 50)
  }, [messages])

  useEffect(() => {
    if (isLoading) {
      scrollToLastMessage()
    }
  }, [isLoading])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`
    }
  }, [inputValue])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const extractResponse = (result: any): string => {
    if (result.message) return result.message
    if (result.response) return result.response
    if (result.data?.message) return result.data.message
    if (typeof result === 'string') return result
    return 'I received your message but had trouble formatting a response. Please try again.'
  }

  const sendMessage = async () => {
    const message = inputValue.trim()
    if (!message || isLoading) return

    try {
      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, userMessage])
      setInputValue('')
      setIsLoading(true)

      const requestData = {
        message,
        conversation_history: conversationHistory,
        timestamp: new Date().toISOString()
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const aiResponse = extractResponse(result)
      
      const aiMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, aiMessage])
      
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: message, timestamp: userMessage.timestamp },
        { role: 'assistant', content: aiResponse, timestamp: aiMessage.timestamp }
      ]
      
      setConversationHistory(newHistory.slice(-20))
      
    } catch (error: any) {
      let errorMessage = 'Unable to connect to Pulse. Please try again.'
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.'
      } else if (error.message) {
        errorMessage = `Unable to connect to Pulse: ${error.message}`
      }
      
      const errorMsg: Message = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const TypingIndicator = () => (
    <div className="flex items-start gap-3 max-w-[75%] self-start">
      <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
        P
      </div>
      <div className="px-5 py-4 rounded-[18px] shadow-sm border border-gray-100 bg-white relative z-10"
           style={{ backgroundColor: '#ffffff' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.1s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.2s]"></span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Background Pattern */}
      <div 
        className="fixed inset-0 opacity-40 pointer-events-none bg-repeat z-0"
        style={{
          backgroundImage: 'url(/doodle9.png)',
          backgroundSize: '400px 400px'
        }}
      />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between shadow-sm h-16">
        <div className="flex items-center gap-4">
          <div className="w-20 sm:w-24 md:w-28 lg:w-32 flex items-center">
            <img 
              src="/avanza_solutions.png" 
              alt="Avanza Solutions" 
              className="w-full h-auto max-h-6 sm:max-h-7 md:max-h-8 lg:max-h-9 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling!.classList.remove('hidden');
              }}
            />
            <div className="text-pink-600 text-lg sm:text-xl md:text-2xl font-bold hidden">avanza</div>
          </div>
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <h1 className="text-xl sm:text-2xl font-medium text-gray-600 whitespace-nowrap">
            Pulse AI
          </h1>
        </div>
      </header>

      {/* Chat Container - Full Width */}
      <div className="flex-1 flex flex-col px-6 mt-16 overflow-hidden h-screen relative z-10">
        
        {/* Messages Container - Auto-hide Scrollbar */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 py-4 overflow-y-auto flex flex-col gap-4 relative z-10"
          style={{
            maxHeight: 'calc(100vh - 160px)',
            minHeight: '400px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              width: 6px;
            }
            div::-webkit-scrollbar-track {
              background: transparent;
            }
            div::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.3);
              border-radius: 3px;
              opacity: 0;
              transition: opacity 0.2s ease;
            }
            div:hover::-webkit-scrollbar-thumb {
              opacity: 1;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: rgba(156, 163, 175, 0.6);
            }
          `}</style>

          <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
            {messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1
              
              return (
                <div
                  key={index}
                  ref={isLastMessage ? lastMessageRef : null}
                  className={`flex items-start gap-3 relative z-10 ${
                    message.role === 'user' 
                      ? 'self-end flex-row-reverse max-w-[70%]' 
                      : 'self-start max-w-[85%]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 relative z-10 ${
                    message.role === 'user' 
                      ? 'bg-pink-600 text-white' 
                      : 'bg-gray-600 text-white'
                  }`}>
                    {message.role === 'user' ? 'You' : 'P'}
                  </div>
                  <div className="flex flex-col relative z-10">
                    <div 
                      className={`px-5 py-4 rounded-[18px] shadow-sm break-words leading-relaxed relative z-10 ${
                        message.role === 'user' 
                          ? 'bg-pink-600 text-white border border-pink-600' 
                          : 'bg-white text-black border border-gray-100'
                      }`}
                      style={{
                        backgroundColor: message.role === 'user' ? '#db2777' : '#ffffff',
                        position: 'relative'
                      }}
                    >
                      {message.content.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < message.content.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                    <div className={`text-xs text-gray-500 mt-2 relative z-10 ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Typing Indicator */}
            {isLoading && (
              <div ref={lastMessageRef} className="relative z-10">
                <TypingIndicator />
              </div>
            )}
          </div>
          
          <div className="h-4" />
        </div>
      </div>

      {/* Input Container - Full Width */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm p-6 border-t border-gray-200/50 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center bg-gray-50/90 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-3 gap-4 transition-colors focus-within:border-pink-600">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="How can I help you today?"
              className="flex-1 border-none bg-transparent outline-none text-base leading-relaxed resize-none min-h-[20px] max-h-[100px] font-sans placeholder-gray-500 text-black"
              rows={1}
              maxLength={1000}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="w-9 h-9 bg-pink-600 text-white rounded-full flex items-center justify-center hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-base"
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ConversationHistoryItem {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ApiResponse {
  message?: string
  response?: string
  output?: string
  data?: {
    message?: string
  }
}

interface UploadedFile {
  name: string
  size: number
  uploadDate: string
  status: 'uploaded' | 'processing' | 'ready'
  upload_id?: string 
}

export default function Home() {
  const [isDeletingFile, setIsDeletingFile] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm **Pulse AI**, your Avanza Solutions assistant. \nI can help you with:\n\n**Revenue Analysis:**\n• Upload Excel files for financial analysis\n• Revenue trends and performance metrics\n• Bilingual support (English & Roman Urdu)\n\nHow can I assist you today?",
      timestamp: new Date().toISOString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<ConversationHistoryItem[]>([])
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showUploadTooltip, setShowUploadTooltip] = useState(false)
  
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sidebarFileInputRef = useRef<HTMLInputElement>(null)
  
  // API URLs
  const chatWebhookUrl = 'https://f3d9e72a9841.ngrok-free.app/webhook/chat'
  const uploadWebhookUrl = 'https://f3d9e72a9841.ngrok-free.app/webhook/upload'
  const deleteApiUrl = 'https://f3d9e72a9841.ngrok-free.app/api/upload'

  // =============================================================================
  // 🔥 AUTO-CLEANUP ON PAGE REFRESH/LOAD
  // =============================================================================
  useEffect(() => {
  const cleanupOnPageLoad = async () => {
    try {
      console.log('🧹 Performing full backend cleanup...')
      const response = await fetch('http://localhost:8000/api/cleanup', {
        method: 'DELETE',
      })

      if (response.ok) {
        console.log('✅ All Supabase tables cleared successfully')
      } else {
        console.warn('⚠️ Cleanup failed:', response.statusText)
      }

      // Always clear localStorage
      localStorage.removeItem('current_upload_id')
      localStorage.removeItem('uploaded_files')
    } catch (error) {
      console.error('❌ Error during cleanup:', error)
    }
  }

  // Run cleanup on component mount (page load/refresh)
  cleanupOnPageLoad()
}, [])


  // =============================================================================

  // Simple, reliable scrolling
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
      setTimeout(scrollToBottom, 50)
      setTimeout(scrollToBottom, 150)
      setTimeout(scrollToBottom, 300)
    }
  }, [messages])

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
          
          if (isNearBottom) {
            scrollToBottom()
          }
        }
      }, 200)
      return () => clearInterval(interval)
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const extractResponse = (result: ApiResponse | string): string => {
    if (typeof result === 'string') return result
    if (result.message) return result.message
    if (result.response) return result.response
    if (result.output) return result.output
    if (result.data?.message) return result.data.message
    return 'I received your message but had trouble formatting a response. Please try again.'
  }

  // 🔥 MODIFIED: Block upload if file already exists
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return

    // 🔥 NEW: Block upload if file already exists
    if (uploadedFile) {
      const errorMsg: Message = {
        role: 'assistant',
        content: '⚠️ Please delete the current file before uploading a new one. You can only work with one file at a time.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMsg])
      return
    }

    const file = files[0]
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Please upload an Excel file (.xlsx or .xls format) for revenue analysis.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMsg])
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)

      const response = await fetch(uploadWebhookUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Upload result:', result)
      
      const newFile: UploadedFile = {
        name: file.name,
        size: file.size,
        uploadDate: new Date().toISOString(),
        status: 'ready',
        upload_id: result.upload_id
      }
      
      setUploadedFile(newFile)
      
      // 🔥 SAVE upload_id to localStorage for cleanup on refresh
      if (result.upload_id) {
        localStorage.setItem('current_upload_id', result.upload_id)
        localStorage.setItem('uploaded_files', JSON.stringify(newFile))
        console.log('💾 Saved upload_id to localStorage:', result.upload_id)
      }
      
      const successMsg: Message = {
        role: 'assistant',
        content: `Perfect! I've successfully processed your Excel file "${file.name}" for revenue analysis. You can now ask me questions in **English** or **Roman Urdu**.\n\nWhat would you like to explore first?`,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, successMsg])
      
    } catch (error: unknown) {
      let errorMessage = 'Failed to upload file. Please try again.'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Upload timed out. Please try again.'
        } else if (error.message) {
          errorMessage = `Upload failed: ${error.message}`
        }
      }
      
      const errorMsg: Message = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    // 🔥 NEW: Don't show drag effect if file already exists
    if (!uploadedFile) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    // 🔥 NEW: Block drop if file already exists
    if (uploadedFile) {
      const errorMsg: Message = {
        role: 'assistant',
        content: '⚠️ Please delete the current file before uploading a new one.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMsg])
      return
    }
    
    const files = e.dataTransfer.files
    if (files) {
      handleFileUpload(files)
    }
  }

  const removeFile = async () => {
    if (!uploadedFile) return
    
    setIsDeletingFile(true)

    try {
      console.log('🧹 Deleting data from database...')
      
      const response = await fetch('http://localhost:8000/api/cleanup', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to cleanup: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Data cleared:', result)
      
      setUploadedFile(null)
      
      // Clear localStorage
      localStorage.removeItem('current_upload_id')
      localStorage.removeItem('uploaded_files')
      console.log('🗑️ Cleared localStorage')
      
      // Clear file inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (sidebarFileInputRef.current) {
        sidebarFileInputRef.current.value = ''
      }
      
      // Reset messages to initial state
      setMessages([
        {
          role: 'assistant',
          content: "Hello! I'm **Pulse AI**, your Avanza Solutions assistant. \nI can help you with:\n\n**Revenue Analysis:**\n• Upload Excel files for financial analysis\n• Revenue trends and performance metrics\n• Bilingual support (English & Roman Urdu)\n\nHow can I assist you today?",
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: `File has been removed. You can upload a new file to start fresh analysis.`,
          timestamp: new Date().toISOString()
        }
      ])
      
      // Clear conversation history
      setConversationHistory([])
      
      // Close sidebar
      setIsSidebarOpen(false)

    } catch (error: unknown) {
      console.error('Cleanup error:', error)
      
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Failed to clear data. Please try refreshing the page.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsDeletingFile(false)
    }
  }

  const sendMessage = async () => {
    const message = inputValue.trim()
    if (!message || isLoading) return

    if (!uploadedFile?.upload_id) {
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Please upload an Excel file first before asking questions.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMsg])
      return
    }

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
        message: message,
        timestamp: new Date().toISOString()
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000)

      const response = await fetch(`${chatWebhookUrl}/${uploadedFile.upload_id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Chat result:', result)
      
      const aiResponse = result.response || result.message || 'I received your message but had trouble formatting a response. Please try again.'
      
      const aiMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, aiMessage])
      
      const newHistory: ConversationHistoryItem[] = [
        ...conversationHistory,
        { role: 'user', content: message, timestamp: userMessage.timestamp },
        { role: 'assistant', content: aiResponse, timestamp: aiMessage.timestamp }
      ]
      
      setConversationHistory(newHistory.slice(-20))
      
    } catch (error: unknown) {
      let errorMessage = 'Unable to connect to Pulse AI. Please try again.'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.'
        } else if (error.message) {
          errorMessage = `Unable to connect to Pulse AI: ${error.message}`
        }
      }
      
      const errorMsg: Message = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, 150)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const renderMessageContent = (content: string) => {
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/•/g, '•')
      .split('\n').map((line, i) => (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: line }} />
          {i < content.split('\n').length - 1 && <br />}
        </span>
      ))
    
    return formattedContent
  }

  const TypingIndicator = () => (
    <div className="flex items-start gap-3 max-w-[75%] self-start">
      <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
        P
      </div>
      <div className="px-5 py-4 rounded-[18px] shadow-sm border border-gray-100 bg-white">
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
    <div 
      className="min-h-screen bg-gray-100 flex font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Background Pattern */}
      <div 
        className="fixed inset-0 opacity-40 pointer-events-none bg-repeat z-0"
        style={{
          backgroundImage: 'url(/doodle9.png)',
          backgroundSize: '400px 400px'
        }}
      />
      
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full z-30 transform transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="w-80 h-full bg-white/95 backdrop-blur-sm shadow-lg border-r border-gray-200">
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Files</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto sidebar-scroll" style={{ height: 'calc(100vh - 64px)' }}>
            {/* 🔥 MODIFIED: Disable upload area if file exists */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uploadedFile 
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                  : isDragOver 
                    ? 'border-pink-600 bg-pink-50 cursor-pointer' 
                    : 'border-gray-300 hover:border-pink-400 hover:bg-gray-50 cursor-pointer'
              }`}
              onClick={() => !uploadedFile && sidebarFileInputRef.current?.click()}
              title={uploadedFile ? 'Delete current file before uploading another' : 'Upload Excel file'}
            >
              <div className="text-3xl mb-2">{uploadedFile ? '🔒' : '📊'}</div>
              <p className={`text-sm mb-2 ${uploadedFile ? 'text-gray-500' : 'text-gray-600'}`}>
                <strong>{uploadedFile ? 'Upload Disabled' : 'Upload Excel File'}</strong>
              </p>
              <p className="text-xs text-gray-500">
                {uploadedFile 
                  ? 'Delete current file to upload new one' 
                  : 'Click here or drag & drop'}
              </p>
              {!uploadedFile && (
                <p className="text-xs text-gray-400 mt-1">
                  .xlsx, .xls files only
                </p>
              )}
            </div>
            
            <input
              ref={sidebarFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              disabled={!!uploadedFile}
            />
            
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Current File {uploadedFile ? '(1)' : '(0)'}
              </h3>
              
              {!uploadedFile ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-2xl mb-2">📁</div>
                  <p className="text-sm">No file uploaded yet</p>
                  <p className="text-xs mt-1">Upload an Excel file to get started</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-lg">📊</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-sm truncate">
                          {uploadedFile.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatFileSize(uploadedFile.size)} • {formatTime(uploadedFile.uploadDate)}
                        </div>
                        <div className="mt-2">
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                            Ready for analysis
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      disabled={isDeletingFile}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ml-2 transition-colors ${
                        isDeletingFile
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'hover:bg-red-100 text-red-500'
                      }`}
                      title="Remove file"
                    >
                      {isDeletingFile ? '⏳' : '✕'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between shadow-sm h-16">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors"
            title="Toggle files sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          
          <div className="w-20 sm:w-24 md:w-28 lg:w-32 flex items-center">
            <img 
              src="/avanza_solutions.png" 
              alt="Avanza Solutions" 
              className="w-full h-auto max-h-6 sm:max-h-7 md:max-h-8 lg:max-h-9 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.nextElementSibling) {
                  target.nextElementSibling.classList.remove('hidden');
                }
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen mt-16 no-scrollbar">
        <div className="flex-1 flex flex-col px-6 relative z-10 min-h-0 overflow-hidden">
          <div 
            ref={messagesContainerRef}
            className="flex-1 py-4 overflow-y-auto flex flex-col gap-4 relative z-10 custom-scrollbar"
            style={{
              maxHeight: 'calc(100vh - 160px)',
              minHeight: '400px'
            }}
          >
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
                          backgroundColor: message.role === 'user' ? '#db2777' : '#ffffff'
                        }}
                      >
                        {renderMessageContent(message.content)}
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
              
              {isLoading && (
                <div ref={lastMessageRef} className="relative z-30">
                  <TypingIndicator />
                </div>
              )}
              
              <div className="h-4" />
            </div>
          </div>

          {/* Input Container */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm p-6 border-t border-gray-200/50 shadow-lg">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center bg-transparent border border-pink-600 rounded-full px-4 py-3 gap-4">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="How can I help you today?"
                  className="flex-1 border-0 bg-transparent outline-none text-base leading-relaxed resize-none min-h-[20px] max-h-[100px] font-sans placeholder-gray-500 text-black focus:outline-none focus:ring-0"
                  rows={1}
                  maxLength={1000}
                  disabled={isLoading}
                  style={{ border: 'none', boxShadow: 'none' }}
                />
                
                {/* 🔥 MODIFIED: Show tooltip and disable when file exists */}
                <div className="relative">
                  <button
                    onClick={() => !uploadedFile && fileInputRef.current?.click()}
                    onMouseEnter={() => uploadedFile && setShowUploadTooltip(true)}
                    onMouseLeave={() => setShowUploadTooltip(false)}
                    disabled={isUploading || !!uploadedFile}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-base ${
                      uploadedFile
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : isUploading
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={uploadedFile ? '' : 'Upload Excel file for revenue analysis'}
                  >
                    {isUploading ? '⏳' : uploadedFile ? '🔒' : '📎'}
                  </button>
                  
                  {/* 🔥 NEW: Custom tooltip for disabled state */}
                  {showUploadTooltip && uploadedFile && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-50">
                      Delete current file before uploading another
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  disabled={!!uploadedFile}
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
      </div>
    </div>
  )
}
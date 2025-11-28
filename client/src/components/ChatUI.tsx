import { Send, Sparkles, Mic, X, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

async function sendMessage(message: string, sessionId: string): Promise<{
  response: string;
  intent: string | null;
  confidence: number;
}> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.details || error.error || "Failed to send message");
  }
  
  return res.json();
}

export function ChatUI() {
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    "Plan a trip to Italy 🍝",
    "Best beaches in Bali 🏖️",
    "Weekend getaway ideas 🚗"
  ];

  const chatMutation = useMutation({
    mutationFn: (msg: string) => sendMessage(msg, sessionId),
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        text: data.response,
        sender: "bot",
        timestamp: new Date(),
      }]);
    },
    onError: (error: Error) => {
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        text: `Sorry, I encountered an error: ${error.message}`,
        sender: "bot",
        timestamp: new Date(),
      }]);
    }
  });

  const handleSend = () => {
    if (!message.trim() || chatMutation.isPending) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: message.trim(),
      sender: "user",
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(message.trim());
    setMessage("");
    setIsExpanded(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
      <div className="relative w-full">
        
        {/* Suggestions Bubbles - Only show when not expanded and no messages */}
        <AnimatePresence>
          {!isExpanded && messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 w-full mb-4 flex flex-wrap justify-center gap-2"
            >
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  data-testid={`suggestion-${i}`}
                  className="bg-white/80 backdrop-blur-md shadow-sm border border-white/50 px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-white transition-colors"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded Chat Window */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel rounded-t-[2rem] mb-0 overflow-hidden"
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-foreground">TripSage AI</span>
                </div>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="w-8 h-8 rounded-full hover:bg-muted/50 flex items-center justify-center text-muted-foreground"
                  data-testid="close-chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="h-[300px] overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Start a conversation with TripSage AI
                  </div>
                )}
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-white/80 text-foreground border border-white/50 rounded-bl-md"
                      }`}
                      data-testid={`message-${msg.sender}-${msg.id}`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {chatMutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white/80 border border-white/50 px-4 py-2.5 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Input */}
        <motion.div 
          layout
          className={`glass-panel p-2 flex items-center gap-2 transition-all duration-300 ${
            isExpanded ? 'rounded-b-[2rem] rounded-t-none' : 'rounded-[2rem]'
          } ${isExpanded ? 'shadow-glow ring-2 ring-primary/20' : ''}`}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Ask TripSage anything..." 
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground font-medium text-base px-2 h-10"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={chatMutation.isPending}
            data-testid="chat-input"
          />

          <div className="flex items-center gap-1">
             <button 
              className="w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors"
              data-testid="mic-button"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSend}
              disabled={!message.trim() || chatMutation.isPending}
              className="w-12 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              data-testid="send-button"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

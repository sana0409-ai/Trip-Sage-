import { Send, Sparkles, Mic, X, Loader2, Plane, Building2, Car, Map } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  showActions?: boolean;
}

interface ActionButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  trigger: string;
  color: string;
  bgColor: string;
}

const actionButtons: ActionButton[] = [
  {
    id: "trip",
    label: "Plan a Trip",
    icon: <Map className="w-5 h-5" />,
    trigger: "I want to plan a trip itinerary",
    color: "text-purple-600",
    bgColor: "bg-purple-100 hover:bg-purple-200",
  },
  {
    id: "flight",
    label: "Flights",
    icon: <Plane className="w-5 h-5" />,
    trigger: "I want to book a flight",
    color: "text-blue-600",
    bgColor: "bg-blue-100 hover:bg-blue-200",
  },
  {
    id: "hotel",
    label: "Hotels",
    icon: <Building2 className="w-5 h-5" />,
    trigger: "I want to book a hotel",
    color: "text-orange-600",
    bgColor: "bg-orange-100 hover:bg-orange-200",
  },
  {
    id: "car",
    label: "Car Rental",
    icon: <Car className="w-5 h-5" />,
    trigger: "I want to rent a car",
    color: "text-green-600",
    bgColor: "bg-green-100 hover:bg-green-200",
  },
];

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
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  const chatMutation = useMutation({
    mutationFn: (msg: string) => sendMessage(msg, sessionId),
    onSuccess: (data) => {
      const isWelcome = !hasInteracted;
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        text: data.response,
        sender: "bot",
        timestamp: new Date(),
        showActions: isWelcome,
      }]);
      if (!hasInteracted) setHasInteracted(true);
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

  const handleSend = (text?: string) => {
    const msgToSend = text || message.trim();
    if (!msgToSend || chatMutation.isPending) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: msgToSend,
      sender: "user",
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(msgToSend);
    if (!text) setMessage("");
    setIsExpanded(true);
  };

  const handleActionClick = (action: ActionButton) => {
    handleSend(action.trigger);
  };


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send initial greeting when chat opens for the first time
  const handleOpenChat = () => {
    setIsExpanded(true);
    if (messages.length === 0) {
      chatMutation.mutate("Hi");
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
      <div className="relative w-full">
        

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
              <div className="h-[350px] overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && !chatMutation.isPending && (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Start a conversation with TripSage AI
                  </div>
                )}
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
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
                    
                    {/* Action Buttons after bot welcome message */}
                    {msg.sender === "bot" && msg.showActions && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap gap-2 mt-3"
                      >
                        {actionButtons.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleActionClick(action)}
                            disabled={chatMutation.isPending}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${action.bgColor} ${action.color}`}
                            data-testid={`action-${action.id}`}
                          >
                            {action.icon}
                            {action.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
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
          <div 
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary cursor-pointer"
            onClick={handleOpenChat}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Ask TripSage anything..." 
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground font-medium text-base px-2 h-10"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={handleOpenChat}
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
              onClick={() => handleSend()}
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

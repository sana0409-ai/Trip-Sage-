import { Send, Sparkles, Mic } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ChatUI() {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = [
    "Plan a trip to Italy 🍝",
    "Best beaches in Bali 🏖️",
    "Weekend getaway near me 🚗"
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
      <div className="relative w-full">
        
        {/* Suggestions Bubbles */}
        <AnimatePresence>
          {isFocused && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 w-full mb-4 flex flex-wrap justify-center gap-2"
            >
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  className="bg-white/80 backdrop-blur-md shadow-sm border border-white/50 px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-white transition-colors"
                  onClick={() => setMessage(s)}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Input */}
        <motion.div 
          layout
          className={`glass-panel rounded-[2rem] p-2 flex items-center gap-2 transition-all duration-300 ${isFocused ? 'shadow-glow ring-2 ring-primary/20' : ''}`}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          
          <input 
            type="text" 
            placeholder="Ask TripSage anything..." 
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground font-medium text-base px-2 h-10"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          />

          <div className="flex items-center gap-1">
             <button className="w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors">
              <Mic className="w-5 h-5" />
            </button>
            <button className="w-12 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all">
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

import { Send, Sparkles, Mic, X, Loader2, Plane, Building2, Car, Map, Clock, DollarSign, User, Mail, Calendar as CalendarIcon, Check } from "lucide-react";
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

interface FlightOption {
  option: number;
  airline: string;
  class: string;
  price: string;
  departure: string;
  arrival: string;
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

function parseFlightOptions(text: string): { flights: FlightOption[], hasFlights: boolean, remainingText: string } {
  const flightPattern = /\*\*Option (\d+)\*\*\s*Airline:\s*(\w+)\s*Class:\s*(\w+)\s*Price:\s*\$?([\d,.]+)\s*Departure:\s*([\dT:-]+)\s*Arrival:\s*([\dT:-]+)/g;
  const flights: FlightOption[] = [];
  let match;
  
  while ((match = flightPattern.exec(text)) !== null) {
    flights.push({
      option: parseInt(match[1]),
      airline: match[2],
      class: match[3],
      price: match[4],
      departure: match[5],
      arrival: match[6],
    });
  }
  
  if (flights.length > 0) {
    let remainingText = text
      .replace(/✈️\s*\*\*Best Flight Options:\*\*/gi, '')
      .replace(flightPattern, '')
      .replace(/✈️/g, '')
      .replace(/Choose an option:.*$/i, '')
      .trim();
    
    return { flights, hasFlights: true, remainingText };
  }
  
  return { flights: [], hasFlights: false, remainingText: text };
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return dateString;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function FlightCard({ flight, onSelect }: { flight: FlightOption; onSelect: (option: number) => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(flight.option)}
      className="w-full bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-3 text-left hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-1.5 rounded-lg">
            <Plane className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <span className="font-bold text-foreground text-sm">{flight.airline}</span>
            <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 rounded-full text-muted-foreground">
              {flight.class}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-green-600 text-lg">${flight.price}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{formatTime(flight.departure)}</span>
          <span className="mx-1">→</span>
          <span>{formatTime(flight.arrival)}</span>
        </div>
        <span className="text-gray-300">|</span>
        <span>{formatDate(flight.departure)}</span>
      </div>
    </motion.button>
  );
}

function BookingConfirmation({ text }: { text: string }) {
  const isBookingSummary = text.includes("Flight Booking Summary") && text.includes("Passenger");
  
  if (!isBookingSummary) return null;

  const parsePassengerData = (): Array<{ name: string; email: string; dob: string }> => {
    const passengers: Array<{ name: string; email: string; dob: string }> = [];
    const passengerMatches = text.match(/🧍 \*\*Passenger \d+\*\*([\s\S]*?)(?=🧍|Would you|$)/g);
    
    if (passengerMatches) {
      passengerMatches.forEach((p) => {
        const nameMatch = p.match(/• Name:\s*(?:\{[^}]*'name':\s*['"])?([^'"\n•}]+)/);
        const emailMatch = p.match(/• Email:\s*([^\n•]+)/);
        const dobMatch = p.match(/• DOB:\s*\{?'?year'?:\s*([\d.]+)[\s\S]*?'?month'?:\s*([\d.]+)[\s\S]*?'?day'?:\s*([\d.]+)/);
        
        let name = "Unknown";
        if (nameMatch) {
          name = nameMatch[1].trim().replace(/['"{}]/g, '');
        }
        
        passengers.push({
          name,
          email: emailMatch ? emailMatch[1].trim() : "N/A",
          dob: dobMatch ? `${String(Math.round(parseFloat(dobMatch[1]))).padStart(2, '0')}/${String(Math.round(parseFloat(dobMatch[2]))).padStart(2, '0')}/${Math.round(parseFloat(dobMatch[3]))}` : "N/A",
        });
      });
    }
    
    return passengers;
  };

  const getFlightDetails = () => {
    const airline = text.match(/• Airline:\s*(\w+)/)?.[1] || "N/A";
    const flightClass = text.match(/• Class:\s*(\w+)/)?.[1] || "N/A";
    const price = text.match(/• Price:\s*\$?([\d,.]+)/)?.[1] || "N/A";
    const route = text.match(/• Route:\s*([^\n•]+)/)?.[1] || "N/A";
    const departure = text.match(/• Departure:\s*([\dT:-]+)/)?.[1] || "N/A";
    const arrival = text.match(/• Arrival:\s*([\dT:-]+)/)?.[1] || "N/A";
    
    return { airline, flightClass, price, route, departure, arrival };
  };

  const passengers = parsePassengerData();
  const flight = getFlightDetails();

  return (
    <div className="w-full space-y-3">
      <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Plane className="w-4 h-4 text-blue-600" />
            Flight Booking
          </h3>
          <div className="text-right">
            <div className="font-bold text-green-600 text-lg">${flight.price}</div>
            <div className="text-xs text-muted-foreground">{flight.flightClass}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Airline</span>
            <div className="font-semibold text-foreground">{flight.airline}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Route</span>
            <div className="font-semibold text-foreground">{flight.route}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Departure</span>
            <div className="font-semibold text-foreground">{formatTime(flight.departure)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Arrival</span>
            <div className="font-semibold text-foreground">{formatTime(flight.arrival)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">Passengers</div>
        {passengers.map((p, i) => (
          <div key={i} className="bg-white/70 border border-white/60 rounded-lg p-2 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground">{p.name}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span>{p.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>DOB: {p.dob}</span>
            </div>
          </div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <Check className="w-4 h-4" />
        Confirm Booking
      </motion.button>
    </div>
  );
}

function FormattedMessage({ text, onFlightSelect }: { text: string; onFlightSelect: (option: number) => void }) {
  const { flights, hasFlights, remainingText } = parseFlightOptions(text);
  const isBooking = text.includes("Flight Booking Summary");
  
  if (isBooking) {
    return <BookingConfirmation text={text} />;
  }
  
  if (hasFlights) {
    return (
      <div className="space-y-2 w-full">
        <div className="text-sm font-medium text-foreground mb-3">Best Flight Options</div>
        {flights.map((flight) => (
          <FlightCard key={flight.option} flight={flight} onSelect={onFlightSelect} />
        ))}
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Tap a flight to select it
        </div>
      </div>
    );
  }
  
  return <span>{text}</span>;
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
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetChat = () => {
    setMessages([]);
    setHasInteracted(false);
    setMessage("");
    setSessionId(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  };

  const handleCloseChat = () => {
    setIsExpanded(false);
    resetChat();
  };

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

  const handleFlightSelect = (option: number) => {
    handleSend(option.toString());
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenChat = () => {
    setIsExpanded(true);
    if (messages.length === 0) {
      chatMutation.mutate("Hi");
    }
  };

  const hasFlightOptions = (text: string) => {
    return text.includes('**Option') && text.includes('Airline:');
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
      <div className="relative w-full">

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel rounded-t-[2rem] mb-0 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-foreground">TripSage AI</span>
                </div>
                <button 
                  onClick={handleCloseChat}
                  className="w-8 h-8 rounded-full hover:bg-muted/50 flex items-center justify-center text-muted-foreground"
                  data-testid="close-chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

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
                      className={`px-4 py-2.5 rounded-2xl text-sm ${
                        msg.sender === "user"
                          ? "max-w-[80%] bg-primary text-primary-foreground rounded-br-md"
                          : hasFlightOptions(msg.text) 
                            ? "w-full bg-transparent p-0" 
                            : "max-w-[80%] bg-white/80 text-foreground border border-white/50 rounded-bl-md"
                      }`}
                      data-testid={`message-${msg.sender}-${msg.id}`}
                    >
                      {msg.sender === "bot" ? (
                        <FormattedMessage text={msg.text} onFlightSelect={handleFlightSelect} />
                      ) : (
                        msg.text
                      )}
                    </div>
                    
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

import { Send, Sparkles, Mic, X, Loader2, Plane, Building2, Car, Map, Clock, DollarSign, User, Mail, Calendar as CalendarIcon, Calendar, Check } from "lucide-react";
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

interface HotelOption {
  option: number;
  hotel: string;
  rating: string;
  price: string;
  checkIn: string;
  checkOut: string;
}

interface CarRentalOption {
  option: number;
  car: string;
  price: string;
  pickUp: string;
  dropOff: string;
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
    trigger: "plan_trip",
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

function parseHotelOptions(text: string): { hotels: HotelOption[], hasHotels: boolean, remainingText: string } {
  const hotels: HotelOption[] = [];
  
  // Split by empty lines to get individual option blocks
  const blocks = text.split(/\n\s*\n/);
  
  for (const block of blocks) {
    if (block.includes("Option") && block.includes("Hotel:")) {
      const optionMatch = block.match(/\*\*Option (\d+)\*\*/);
      const hotelMatch = block.match(/Hotel:\s*([^\n]+)/);
      const ratingMatch = block.match(/Rating:\s*([^\n]+)/);
      const priceMatch = block.match(/Price:\s*\$?([\d,.]+)/);
      const checkInMatch = block.match(/Check-In:\s*([\d-]+)/);
      const checkOutMatch = block.match(/Check-Out:\s*([\d-]+)/);
      
      if (optionMatch && hotelMatch && ratingMatch && priceMatch && checkInMatch && checkOutMatch) {
        hotels.push({
          option: parseInt(optionMatch[1]),
          hotel: hotelMatch[1].trim(),
          rating: ratingMatch[1].trim(),
          price: priceMatch[1],
          checkIn: checkInMatch[1],
          checkOut: checkOutMatch[1],
        });
      }
    }
  }
  
  if (hotels.length > 0) {
    let remainingText = text
      .replace(/🏨\s*\*\*Best Hotel Options:\*\*/gi, '')
      .split(/Choose a hotel:/)[0]
      .replace(/⭐[\s\S]*?Check-Out:\s*[\d-]+/g, '')
      .trim();
    
    return { hotels, hasHotels: true, remainingText };
  }
  
  return { hotels: [], hasHotels: false, remainingText: text };
}

function parseCarRentalOptions(text: string): { cars: CarRentalOption[], hasCars: boolean, remainingText: string } {
  const cars: CarRentalOption[] = [];
  
  // Split by empty lines to get individual option blocks
  const blocks = text.split(/\n\s*\n/);
  
  for (const block of blocks) {
    if (block.includes("Option") && block.includes("Car:")) {
      const optionMatch = block.match(/\*\*Option (\d+)\*\*/);
      const carMatch = block.match(/Car:\s*([^\n]+)/);
      const priceMatch = block.match(/Price:\s*\$?([\d,.]+)/);
      const pickUpMatch = block.match(/Pick-Up:\s*([^\n]+)/);
      const dropOffMatch = block.match(/Drop-Off:\s*([^\n]+)/);
      
      if (optionMatch && carMatch && priceMatch && pickUpMatch && dropOffMatch) {
        cars.push({
          option: parseInt(optionMatch[1]),
          car: carMatch[1].trim(),
          price: priceMatch[1],
          pickUp: pickUpMatch[1].trim(),
          dropOff: dropOffMatch[1].trim(),
        });
      }
    }
  }
  
  if (cars.length > 0) {
    let remainingText = text
      .replace(/🚗\s*\*\*Best Car Rental Options:\*\*/gi, '')
      .split(/Choose a car:/)[0]
      .replace(/🚗[\s\S]*?Drop-Off:\s*[^\n]+/g, '')
      .trim();
    
    return { cars, hasCars: true, remainingText };
  }
  
  return { cars: [], hasCars: false, remainingText: text };
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

function HotelCard({ hotel, onSelect }: { hotel: HotelOption; onSelect: (option: number) => void }) {
  const ratingValue = hotel.rating === "None" ? "-" : hotel.rating;
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(hotel.option)}
      className="w-full bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-3 text-left hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-orange-100 p-1.5 rounded-lg">
            <Building2 className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-foreground text-sm line-clamp-1">{hotel.hotel}</span>
            {ratingValue !== "-" && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-100 rounded-full text-yellow-700">
                ⭐ {ratingValue}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-green-600 text-lg">${hotel.price}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(hotel.checkIn)}</span>
          <span className="mx-1">→</span>
          <span>{formatDate(hotel.checkOut)}</span>
        </div>
      </div>
    </motion.button>
  );
}

function CarRentalCard({ car, onSelect }: { car: CarRentalOption; onSelect: (option: number) => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(car.option)}
      className="w-full bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-3 text-left hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 p-1.5 rounded-lg">
            <Car className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-foreground text-sm line-clamp-1">{car.car}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-green-600 text-lg">${car.price}</div>
        </div>
      </div>
      
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-start gap-1">
          <span className="text-foreground font-medium">Pick-Up:</span>
          <span className="line-clamp-1">{car.pickUp}</span>
        </div>
        <div className="flex items-start gap-1">
          <span className="text-foreground font-medium">Drop-Off:</span>
          <span className="line-clamp-1">{car.dropOff}</span>
        </div>
      </div>
    </motion.button>
  );
}

function HotelSelection({ text }: { text: string }) {
  const isHotelSelection = text.includes("Selected Hotel") && text.includes("Name:");
  
  if (!isHotelSelection) return null;

  const getHotelDetails = () => {
    // Extract ONLY the "Selected Hotel" section - the part between **Selected Hotel** and "Please provide"
    const selectedHotelRegex = /\*\*Selected Hotel\*\*\n([\s\S]*?)(?:Please provide|$)/;
    const selectedHotelMatch = text.match(selectedHotelRegex);
    
    if (!selectedHotelMatch) return { name: "N/A", rating: "N/A", price: "N/A", checkIn: "N/A", checkOut: "N/A" };
    
    const hotelSection = selectedHotelMatch[1];
    
    // Extract values - only from the Selected Hotel section
    const nameMatch = hotelSection.match(/• Name:\s*([^\n]+)/);
    const ratingMatch = hotelSection.match(/• Rating:\s*([^\n]+)/);
    const priceMatch = hotelSection.match(/• Price:\s*\$?([\d,.]+)/);
    const checkInMatch = hotelSection.match(/• Check-In:\s*([\d-]+)/);
    const checkOutMatch = hotelSection.match(/• Check-Out:\s*([\d-]+)/);
    
    return {
      name: nameMatch ? nameMatch[1].trim() : "N/A",
      rating: ratingMatch ? ratingMatch[1].trim() : "N/A",
      price: priceMatch ? priceMatch[1] : "N/A",
      checkIn: checkInMatch ? checkInMatch[1] : "N/A",
      checkOut: checkOutMatch ? checkOutMatch[1] : "N/A",
    };
  };

  const getRemainingText = () => {
    // Extract text after Check-Out date
    const match = text.match(/Check-Out:\s*[\d-]+([\s\S]+)$/);
    return match ? match[1].trim() : "";
  };

  const hotel = getHotelDetails();
  const remainingText = getRemainingText();

  return (
    <div className="w-full space-y-3">
      <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-3 space-y-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1">
            <div className="bg-orange-100 p-2 rounded-lg mt-1 flex-shrink-0">
              <Building2 className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground line-clamp-2">{hotel.name}</h3>
              {hotel.rating !== "N/A" && (
                <span className="text-xs px-2 py-0.5 bg-yellow-100 rounded-full text-yellow-700 inline-flex items-center gap-1 mt-1">
                  ⭐ {hotel.rating}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-green-600 text-lg">${hotel.price}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-blue-50 rounded-lg p-2">
            <span className="text-muted-foreground block text-xs mb-1">Check-In</span>
            <div className="font-semibold text-foreground">{formatDate(hotel.checkIn)}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <span className="text-muted-foreground block text-xs mb-1">Check-Out</span>
            <div className="font-semibold text-foreground">{formatDate(hotel.checkOut)}</div>
          </div>
        </div>
      </div>
      {remainingText && <span className="text-sm text-foreground">{remainingText}</span>}
    </div>
  );
}

function SelectedFlightDisplay({ text }: { text: string }) {
  const isFlightSelection = text.includes("Selected Flight") && text.includes("Airline:");
  
  if (!isFlightSelection) return null;

  const getFlightDetails = () => {
    // Extract ONLY the "Selected Flight Details" section
    const selectedFlightRegex = /\*\*Selected Flight.*?\*\*\s*([\s\S]*?)(?:Please|Let me|$)/i;
    const selectedFlightMatch = text.match(selectedFlightRegex);
    
    if (!selectedFlightMatch) return { airline: "N/A", class: "N/A", price: "N/A", departure: "N/A", arrival: "N/A" };
    
    const flightSection = selectedFlightMatch[1];
    
    // Match bullet point format: • Airline: TW
    const airlineMatch = flightSection.match(/•\s*Airline:\s*([^\n]+)/);
    const classMatch = flightSection.match(/•\s*Class:\s*([^\n]+)/);
    const priceMatch = flightSection.match(/•\s*Price:\s*\$?([\d,.]+)/);
    const departureMatch = flightSection.match(/•\s*Departure:\s*([^\n]+)/);
    const arrivalMatch = flightSection.match(/•\s*Arrival:\s*([^\n]+)/);
    
    return {
      airline: airlineMatch ? airlineMatch[1].trim() : "N/A",
      class: classMatch ? classMatch[1].trim() : "N/A",
      price: priceMatch ? priceMatch[1] : "N/A",
      departure: departureMatch ? departureMatch[1].trim() : "N/A",
      arrival: arrivalMatch ? arrivalMatch[1].trim() : "N/A",
    };
  };

  const getRemainingText = () => {
    // Find text after the Selected Flight section
    const idx = text.indexOf("Please enter");
    return idx > 0 ? text.substring(idx).trim() : "";
  };

  const flight = getFlightDetails();
  const remainingText = getRemainingText();

  return (
    <div className="w-full space-y-3">
      <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-3 space-y-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1">
            <div className="bg-blue-100 p-2 rounded-lg mt-1 flex-shrink-0">
              <Plane className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground">{flight.airline}</h3>
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-muted-foreground inline-block mt-1">
                {flight.class}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-green-600 text-lg">${flight.price}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-blue-50 rounded-lg p-2">
            <span className="text-muted-foreground block text-xs mb-1">Departure</span>
            <div className="font-semibold text-foreground">{formatTime(flight.departure)}</div>
            <div className="text-muted-foreground text-xs">{formatDate(flight.departure)}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <span className="text-muted-foreground block text-xs mb-1">Arrival</span>
            <div className="font-semibold text-foreground">{formatTime(flight.arrival)}</div>
            <div className="text-muted-foreground text-xs">{formatDate(flight.arrival)}</div>
          </div>
        </div>
      </div>
      {remainingText && <span className="text-sm text-foreground">{remainingText}</span>}
    </div>
  );
}

function SelectedCarDisplay({ text }: { text: string }) {
  const isCarSelection = text.includes("Selected Car") && text.includes("Type:");
  
  if (!isCarSelection) return null;

  const getCarDetails = () => {
    // Extract ONLY the "Selected Car" section - the part between **Selected Car** and text that follows
    const selectedCarRegex = /\*\*Selected Car\*\*\s*([\s\S]*?)(?=Let me|Please enter|$)/;
    const selectedCarMatch = text.match(selectedCarRegex);
    
    if (!selectedCarMatch) return { type: "N/A", price: "N/A", pickUp: "N/A", dropOff: "N/A" };
    
    const carSection = selectedCarMatch[1];
    
    // Extract values - only from the Selected Car section
    const typeMatch = carSection.match(/• Type:\s*([^\n]+)/);
    const priceMatch = carSection.match(/• Price:\s*\$?([\d,.]+)/);
    const pickUpMatch = carSection.match(/• Pick-Up:\s*([^\n]+)/);
    const dropOffMatch = carSection.match(/• Drop-Off:\s*([^\n]+)/);
    
    return {
      type: typeMatch ? typeMatch[1].trim() : "N/A",
      price: priceMatch ? priceMatch[1] : "N/A",
      pickUp: pickUpMatch ? pickUpMatch[1].trim() : "N/A",
      dropOff: dropOffMatch ? dropOffMatch[1].trim() : "N/A",
    };
  };

  const getRemainingText = () => {
    // Extract everything after the Selected Car section
    const match = text.match(/• Drop-Off:\s*[^\n]+(?:\n|)([^]*?)$/);
    if (!match) return "";
    
    let remaining = text;
    // Find where the car details end by looking for key prompts
    const carEndIdx = Math.max(
      remaining.indexOf("Let me collect"),
      remaining.indexOf("Please enter")
    );
    
    if (carEndIdx > 0) {
      return remaining.substring(carEndIdx).trim();
    }
    
    return "";
  };

  const car = getCarDetails();
  const remainingText = getRemainingText();

  return (
    <div className="w-full space-y-3">
      <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-3 space-y-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1">
            <div className="bg-green-100 p-2 rounded-lg mt-1 flex-shrink-0">
              <Car className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground line-clamp-2">{car.type}</h3>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-green-600 text-lg">${car.price}</div>
          </div>
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="bg-green-50 rounded-lg p-2">
            <span className="text-muted-foreground block text-xs mb-1">Pick-Up</span>
            <div className="font-semibold text-foreground line-clamp-2">{car.pickUp}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <span className="text-muted-foreground block text-xs mb-1">Drop-Off</span>
            <div className="font-semibold text-foreground line-clamp-2">{car.dropOff}</div>
          </div>
        </div>
      </div>
      {remainingText && <span className="text-sm text-foreground">{remainingText}</span>}
    </div>
  );
}

function HotelBookingConfirmation({ text, onConfirm }: { text: string; onConfirm: () => void }) {
  const isBookingSummary = text.includes("Hotel Booking Summary");
  
  if (!isBookingSummary) return null;

  const getHotelDetails = () => {
    const hotel = text.match(/• Hotel:\s*([^\n•]+)/)?.[1]?.trim() || "N/A";
    const rating = text.match(/• Rating:\s*([^\n•]+)/)?.[1]?.trim() || "N/A";
    const price = text.match(/• Price:\s*\$?([\d,.]+)/)?.[1] || "N/A";
    const checkIn = text.match(/• Check-In:\s*([\d-]+)/)?.[1] || "N/A";
    const checkOut = text.match(/• Check-Out:\s*([\d-]+)/)?.[1] || "N/A";
    
    return { hotel, rating, price, checkIn, checkOut };
  };

  const getGuestDetails = () => {
    const numGuests = text.match(/• Number of Guests:\s*([^\n•]+)/)?.[1]?.trim() || "1";
    const name = text.match(/👤[\s\S]*?• Name:\s*([^\n•]+)/)?.[1]?.trim() || "N/A";
    const email = text.match(/• Email:\s*([^\n•]+)/)?.[1]?.trim() || "N/A";
    const dobMatch = text.match(/• DOB:\s*\{?'?year'?:\s*([\d.]+)[\s\S]*?'?month'?:\s*([\d.]+)[\s\S]*?'?day'?:\s*([\d.]+)/);
    
    let dob = "N/A";
    if (dobMatch) {
      dob = `${String(Math.round(parseFloat(dobMatch[2]))).padStart(2, '0')}/${String(Math.round(parseFloat(dobMatch[3]))).padStart(2, '0')}/${Math.round(parseFloat(dobMatch[1]))}`;
    }
    
    return { numGuests, name, email, dob };
  };

  const hotelDetails = getHotelDetails();
  const guestDetails = getGuestDetails();

  return (
    <div className="w-full space-y-3">
      <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-600" />
            Hotel Booking
          </h3>
          <div className="text-right">
            <div className="font-bold text-green-600 text-lg">${hotelDetails.price}</div>
            {hotelDetails.rating !== "N/A" && (
              <div className="text-xs text-yellow-700">⭐ {hotelDetails.rating}</div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div>
            <span className="text-xs text-muted-foreground">Hotel Name</span>
            <div className="font-semibold text-foreground text-sm">{hotelDetails.hotel}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Check-In</span>
              <div className="font-semibold text-foreground">{formatDate(hotelDetails.checkIn)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Check-Out</span>
              <div className="font-semibold text-foreground">{formatDate(hotelDetails.checkOut)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">Guest Information</div>
        <div className="bg-white/70 border border-white/60 rounded-lg p-2 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-foreground">{guestDetails.name}</span>
            <span className="text-muted-foreground ml-auto">({guestDetails.numGuests} guest{guestDetails.numGuests !== "1" ? "s" : ""})</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-3.5 h-3.5" />
            <span>{guestDetails.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>DOB: {guestDetails.dob}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirm}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
          data-testid="button-confirm-hotel"
        >
          <Check className="w-4 h-4" />
          Confirm
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const event = new CustomEvent('sendFlightPreference', { detail: { preference: 'No' } });
            window.dispatchEvent(event);
          }}
          className="flex-1 bg-white/40 hover:bg-white/60 border border-white/50 text-foreground rounded-xl py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all backdrop-blur-sm"
          data-testid="button-not-interested-hotel"
        >
          <X className="w-4 h-4" />
          Skip
        </motion.button>
      </div>
    </div>
  );
}

function BookingConfirmation({ text, onConfirm }: { text: string; onConfirm: () => void }) {
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

      <div className="flex gap-2 pt-1">
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirm}
          className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
          data-testid="button-confirm-booking"
        >
          <Check className="w-4 h-4" />
          Confirm
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const event = new CustomEvent('sendFlightPreference', { detail: { preference: 'No' } });
            window.dispatchEvent(event);
          }}
          className="flex-1 bg-white/40 hover:bg-white/60 border border-white/50 text-foreground rounded-xl py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all backdrop-blur-sm"
          data-testid="button-not-interested"
        >
          <X className="w-4 h-4" />
          Skip
        </motion.button>
      </div>
    </div>
  );
}

function ItineraryCard({ text, onProceed }: { text: string; onProceed: () => void }) {
  const isItinerary = text.includes("Best Time to Visit:") && (text.includes("Top Activities:") || text.includes("Budget:"));
  
  if (!isItinerary) return null;
  
  const parseItinerary = () => {
    const bestTimeMatch = text.match(/\*\*Best Time to Visit:\*\*\s*([^*]+?)(?=\*\*|$)/);
    const activitiesMatch = text.match(/\*\*Top Activities:\*\*\s*([\s\S]*?)(?=\*\*Unique|Budget:|$)/);
    const uniqueMatch = text.match(/\*\*Unique Experience:\*\*\s*([^*]+?)(?=\*\*|$)/);
    const budgetMatch = text.match(/\*\*Budget:\*\*\s*([^*]+?)(?=\*\*|$)/);
    const packingMatch = text.match(/\*\*Packing Tip:\*\*\s*([^*]+?)(?=\*\*|$)/);
    
    const activities = activitiesMatch 
      ? activitiesMatch[1]
          .split('*')
          .map(a => a.trim())
          .filter(a => a && !a.includes('•'))
      : [];
    
    return {
      bestTime: bestTimeMatch ? bestTimeMatch[1].trim() : "",
      activities,
      unique: uniqueMatch ? uniqueMatch[1].trim() : "",
      budget: budgetMatch ? budgetMatch[1].trim() : "",
      packing: packingMatch ? packingMatch[1].trim() : "",
    };
  };
  
  const itinerary = parseItinerary();
  
  return (
    <div className="w-full space-y-3">
      <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
            <Map className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="font-bold text-foreground">Trip Itinerary</h3>
        </div>
        
        {itinerary.bestTime && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">Best Time to Visit</span>
            <p className="text-sm text-foreground">{itinerary.bestTime}</p>
          </div>
        )}
        
        {itinerary.activities.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground block">Top Activities</span>
            <ul className="space-y-1">
              {itinerary.activities.map((activity, i) => (
                <li key={i} className="text-sm text-foreground flex gap-2">
                  <span className="text-purple-400 flex-shrink-0">•</span>
                  <span>{activity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {itinerary.unique && (
          <div className="bg-purple-50 rounded-lg p-2 space-y-1">
            <span className="text-xs font-semibold text-purple-900 block">Unique Experience</span>
            <p className="text-sm text-purple-900">{itinerary.unique}</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          {itinerary.budget && (
            <div className="bg-green-50 rounded-lg p-2">
              <span className="text-xs text-muted-foreground block mb-1">Budget</span>
              <p className="text-xs font-semibold text-foreground">{itinerary.budget}</p>
            </div>
          )}
          {itinerary.packing && (
            <div className="bg-blue-50 rounded-lg p-2">
              <span className="text-xs text-muted-foreground block mb-1">Packing Tip</span>
              <p className="text-xs font-semibold text-foreground">{itinerary.packing}</p>
            </div>
          )}
        </div>
      </div>
      
      <motion.button
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onProceed}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <Check className="w-4 h-4" />
        Proceed with this itinerary
      </motion.button>
    </div>
  );
}

function FormattedMessage({ text, onFlightSelect, inBookingFlow }: { text: string; onFlightSelect: (option: number) => void; inBookingFlow?: boolean }) {
  // Special case: duplicate itinerary marker
  if (text === "duplicate-itinerary") {
    return (
      <div className="space-y-2 w-full">
        <span className="text-sm text-foreground block mb-2">Great! What would you like to book?</span>
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onFlightSelect(1)}
          className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          data-testid="button-book-flight"
        >
          <Plane className="w-4 h-4" />
          Book a Flight
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onFlightSelect(2)}
          className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          data-testid="button-book-hotel"
        >
          <Building2 className="w-4 h-4" />
          Book a Hotel
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onFlightSelect(3)}
          className="w-full bg-green-100 hover:bg-green-200 text-green-700 rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          data-testid="button-rent-car"
        >
          <Car className="w-4 h-4" />
          Rent a Car
        </motion.button>
      </div>
    );
  }
  
  const { flights, hasFlights } = parseFlightOptions(text);
  const { hotels, hasHotels } = parseHotelOptions(text);
  const { cars, hasCars } = parseCarRentalOptions(text);
  const isFlightBooking = text.includes("Flight Booking Summary") && text.includes("Passenger");
  const isHotelBooking = text.includes("Hotel Booking Summary");
  const isFlightSelected = text.includes("Selected Flight") && text.includes("Airline:");
  const isHotelSelected = text.includes("Selected Hotel") && text.includes("Name:");
  const isCarSelected = text.includes("Selected Car") && text.includes("Type:");
  const isItinerary = text.includes("Best Time to Visit:") && (text.includes("Top Activities:") || text.includes("Budget:"));
  
  const handleConfirmBooking = () => {
    const event = new CustomEvent('confirmBooking');
    window.dispatchEvent(event);
  };
  
  const handleProceedItinerary = () => {
    const event = new CustomEvent('proceedItinerary');
    window.dispatchEvent(event);
  };
  
  if (isFlightBooking) {
    return <BookingConfirmation text={text} onConfirm={handleConfirmBooking} />;
  }
  
  if (isHotelBooking) {
    return <HotelBookingConfirmation text={text} onConfirm={handleConfirmBooking} />;
  }
  
  if (isFlightSelected) {
    return <SelectedFlightDisplay text={text} />;
  }
  
  if (isHotelSelected) {
    return <HotelSelection text={text} />;
  }
  
  if (isCarSelected) {
    return <SelectedCarDisplay text={text} />;
  }
  
  if (isItinerary && !inBookingFlow) {
    return <ItineraryCard text={text} onProceed={handleProceedItinerary} />;
  }
  
  // If we're in booking flow but got itinerary response, hide it (Dialogflow returning cached data)
  if (isItinerary && inBookingFlow) {
    return null;
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
  
  if (hasHotels) {
    return (
      <div className="space-y-2 w-full">
        <div className="text-sm font-medium text-foreground mb-3">Best Hotel Options</div>
        {hotels.map((hotel) => (
          <HotelCard key={hotel.option} hotel={hotel} onSelect={onFlightSelect} />
        ))}
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Tap a hotel to select it
        </div>
      </div>
    );
  }
  
  if (hasCars) {
    return (
      <div className="space-y-2 w-full">
        <div className="text-sm font-medium text-foreground mb-3">Best Car Rental Options</div>
        {cars.map((car) => (
          <CarRentalCard key={car.option} car={car} onSelect={onFlightSelect} />
        ))}
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Tap a car to select it
        </div>
      </div>
    );
  }
  
  // Check if asking for flight preference/class
  const isFlightPreference = text.toLowerCase().includes("flight class") || 
    (text.toLowerCase().includes("class") && text.toLowerCase().includes("please provide")) ||
    (text.toLowerCase().includes("preference") && text.toLowerCase().includes("class"));
  
  if (isFlightPreference) {
    const handlePreferenceClick = (preference: string) => {
      const event = new CustomEvent('sendFlightPreference', { detail: { preference } });
      window.dispatchEvent(event);
    };
    
    return (
      <div className="space-y-3 w-full">
        <span className="text-sm text-foreground block">{text}</span>
        <div className="space-y-2">
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePreferenceClick("Economy")}
            className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            data-testid="button-economy"
          >
            <Plane className="w-4 h-4" />
            Economy
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePreferenceClick("Business")}
            className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            data-testid="button-business"
          >
            <Plane className="w-4 h-4" />
            Business
          </motion.button>
        </div>
      </div>
    );
  }
  
  // Check if asking for car type
  const isCarTypeQuestion = text.toLowerCase().includes("type of car") || 
    (text.toLowerCase().includes("car") && text.toLowerCase().includes("please provide") && text.toLowerCase().includes("type")) ||
    text.toLowerCase().includes("vehicle type");
  
  if (isCarTypeQuestion) {
    const handleCarTypeClick = (carType: string) => {
      const event = new CustomEvent('sendFlightPreference', { detail: { preference: carType } });
      window.dispatchEvent(event);
    };
    
    return (
      <div className="space-y-3 w-full">
        <span className="text-sm text-foreground block">{text}</span>
        <div className="space-y-2">
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCarTypeClick("SUV")}
            className="w-full bg-green-100 hover:bg-green-200 text-green-700 rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            data-testid="button-suv"
          >
            <Car className="w-4 h-4" />
            SUV
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCarTypeClick("Sedan")}
            className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            data-testid="button-sedan"
          >
            <Car className="w-4 h-4" />
            Sedan
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCarTypeClick("Mini Van")}
            className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            data-testid="button-minivan"
          >
            <Car className="w-4 h-4" />
            Mini Van
          </motion.button>
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
  currentPage: string | null;
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
  const [waitingForDestination, setWaitingForDestination] = useState(false);
  const [lastItinerary, setLastItinerary] = useState<string>("");
  const [showBookingButtons, setShowBookingButtons] = useState(false);
  const [inBookingFlow, setInBookingFlow] = useState(false);
  const [activeBookingType, setActiveBookingType] = useState<string | null>(null);
  const [bookingFormActive, setBookingFormActive] = useState(false);
  const [bookingPrompt, setBookingPrompt] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [hasDisplayableOptions, setHasDisplayableOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetChat = () => {
    setMessages([]);
    setHasInteracted(false);
    setMessage("");
    setSessionId(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setWaitingForDestination(false);
    setLastItinerary("");
    setShowBookingButtons(false);
    setInBookingFlow(false);
    setActiveBookingType(null);
    setBookingFormActive(false);
    setBookingPrompt("");
    setCurrentPage(null);
    setHasDisplayableOptions(false);
  };

  const handleCloseChat = () => {
    setIsExpanded(false);
    resetChat();
  };

  const chatMutation = useMutation({
    mutationFn: (msg: string) => sendMessage(msg, sessionId),
    onSuccess: (data) => {
      const isWelcome = !hasInteracted;
      const isItinerary = data.response.includes("Best Time to Visit:") && (data.response.includes("Top Activities:") || data.response.includes("Budget:"));
      
      // Capture current page from Dialogflow
      setCurrentPage(data.currentPage);
      
      // Check if Dialogflow is asking for booking info
      const isBookingPrompt = inBookingFlow && (
        data.response.includes("Please provide the departure city") ||
        data.response.includes("Please provide the destination city") ||
        data.response.includes("Please provide") ||
        data.response.includes("provide the")
      );
      
      // Check if showing booking options (Flight_Options, Hotel_Options, Car_Options)
      // BUT only if there are actual options in the response
      const hasAnyOptions = data.response.includes("**Option");
      const isShowingOptions = !!(hasAnyOptions && data.currentPage && data.currentPage.endsWith("_Options"));
      
      // Always reset hasDisplayableOptions - only set true if we're actually showing options
      setHasDisplayableOptions(isShowingOptions);
      
      // Check if this is a duplicate itinerary (same one coming back) AND we haven't already shown booking buttons
      const isDuplicate = isItinerary && lastItinerary !== "" && lastItinerary === data.response && !showBookingButtons;
      
      // Set or update last itinerary only if this is the first time seeing it
      if (isItinerary && lastItinerary === "") {
        setLastItinerary(data.response);
      }
      
      // If showing booking options, disable input
      if (isShowingOptions) {
        setBookingFormActive(false);
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: data.response,
          sender: "bot",
          timestamp: new Date(),
        }]);
      } else if (isBookingPrompt) {
        setBookingPrompt(data.response);
        setBookingFormActive(true);
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: data.response,
          sender: "bot",
          timestamp: new Date(),
        }]);
      } else if (isDuplicate) {
        setShowBookingButtons(true);
        setLastItinerary("");
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: "duplicate-itinerary",
          sender: "bot",
          timestamp: new Date(),
        }]);
      } else {
        // Normal message display
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          text: data.response,
          sender: "bot",
          timestamp: new Date(),
          showActions: isWelcome,
        }]);
      }
      
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
    
    // If booking form is active, close it after sending
    if (bookingFormActive) {
      setBookingFormActive(false);
      setBookingPrompt("");
    }
    
    // If waiting for destination, extract just the city/destination name
    if (waitingForDestination) {
      setWaitingForDestination(false);
      // Extract destination - remove common phrases like "trip to", "adventure", "vacation", etc
      let destination = msgToSend
        .toLowerCase()
        .replace(/^(.*?)(trip|vacation|journey|adventure|holiday)?\s*to\s+/i, '')
        .replace(/^(an?|the)\s+/i, '')
        .trim();
      
      // If nothing extracted, use the whole message
      if (!destination || destination.length < 2) {
        destination = msgToSend;
      }
      
      chatMutation.mutate(`I want to plan a trip to ${destination}`);
    } else {
      chatMutation.mutate(msgToSend);
    }
    
    if (!text) setMessage("");
    setIsExpanded(true);
  };

  const handleActionClick = (action: ActionButton) => {
    // For plan_trip, show destination question first
    if (action.trigger === "plan_trip") {
      // Reset state for new trip
      setShowBookingButtons(false);
      setInBookingFlow(false);
      setLastItinerary("");
      
      const botQuestion: Message = {
        id: `bot-${Date.now()}`,
        text: "Where do you want to plan your trip to?",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botQuestion]);
      setWaitingForDestination(true);
    } else {
      handleSend(action.trigger);
    }
  };

  const handleFlightSelect = (option: number) => {
    // If we're on booking options page (duplicate-itinerary showing flight/hotel/car buttons)
    // then 1=flight, 2=hotel, 3=car
    const bookingMessages: { [key: number]: string } = {
      1: "I want to book a flight",
      2: "I want to book a hotel",
      3: "I want to rent a car",
    };
    const bookingTypes: { [key: number]: string } = {
      1: "flight",
      2: "hotel",
      3: "car",
    };
    
    // If we're showing actual booking options (Flight_Options, Hotel_Options, Car_Options),
    // send just the option number
    if (currentPage && currentPage.endsWith("_Options")) {
      handleSend(option.toString());
    } else {
      // Otherwise we're selecting booking type from duplicate-itinerary
      setActiveBookingType(bookingTypes[option] || null);
      setInBookingFlow(true);
      setBookingFormActive(false);
      handleSend(bookingMessages[option] || option.toString());
    }
  };

  useEffect(() => {
    const handleConfirmBooking = () => {
      handleSend("Yes");
    };
    
    window.addEventListener('confirmBooking', handleConfirmBooking);
    return () => window.removeEventListener('confirmBooking', handleConfirmBooking);
  }, []);

  useEffect(() => {
    const handleProceedItinerary = () => {
      // Instead of sending to Dialogflow, directly show booking options
      setShowBookingButtons(true);
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        text: "duplicate-itinerary", // Special marker to show booking buttons
        sender: "bot",
        timestamp: new Date(),
      }]);
    };
    
    const handleFlightPreference = (event: Event) => {
      const customEvent = event as CustomEvent;
      const preference = customEvent.detail?.preference;
      if (preference) {
        handleSend(preference);
      }
    };
    
    window.addEventListener('proceedItinerary', handleProceedItinerary);
    window.addEventListener('sendFlightPreference', handleFlightPreference);
    return () => {
      window.removeEventListener('proceedItinerary', handleProceedItinerary);
      window.removeEventListener('sendFlightPreference', handleFlightPreference);
    };
  }, []);

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
    return text.includes('**Option') && (text.includes('Airline:') || text.includes('Hotel:'));
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
                          : (hasFlightOptions(msg.text) || msg.text === "duplicate-itinerary")
                            ? "w-full bg-transparent p-0" 
                            : "max-w-[80%] bg-white/80 text-foreground border border-white/50 rounded-bl-md"
                      }`}
                      data-testid={`message-${msg.sender}-${msg.id}`}
                    >
                      {msg.sender === "bot" ? (
                        <FormattedMessage text={msg.text} onFlightSelect={handleFlightSelect} inBookingFlow={inBookingFlow} />
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
          
          {hasDisplayableOptions ? (
            <div className="flex-1 text-muted-foreground text-sm px-2 py-1 italic">
              Select an option above
            </div>
          ) : (
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
          )}

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

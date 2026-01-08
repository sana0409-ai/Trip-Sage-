import { Star, Calendar, Plane } from "lucide-react";
import { motion } from "framer-motion";
import illustration from "@assets/generated_images/professional_world_map_with_flights.png";

export function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      
      {/* Background Map Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${illustration})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Gradient Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90 z-[1]" />

      {/* Soft color accents */}
      <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-blue-300/20 rounded-full blur-[100px] z-[1]" />
      <div className="absolute bottom-[10%] left-[10%] w-[350px] h-[350px] bg-orange-200/20 rounded-full blur-[80px] z-[1]" />

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-6 pt-32 pb-40">
        
        {/* Centered Text Content */}
        <div className="max-w-3xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-white/60 backdrop-blur-sm mb-6 shadow-sm"
          >
            <span className="bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 rounded-md">NEW</span>
            <span className="text-sm font-medium text-muted-foreground">AI-Powered Travel Planning</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold leading-[1.1] text-foreground mb-6"
          >
            Explore the world <br/>
            <span className="text-gradient">effortlessly.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto"
          >
            TripSage is your personal AI travel companion. From flights to hidden gems, we plan it all in seconds.
          </motion.p>
        </div>

        {/* Floating Glass Cards - Scattered around */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="hidden md:flex absolute top-1/4 left-[5%] glass-panel p-4 rounded-2xl z-20 items-center gap-3 w-max rotate-[-6deg] hover:rotate-0 transition-transform duration-300"
        >
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Flight to</p>
            <p className="text-sm font-bold text-foreground">Tokyo, JPN</p>
          </div>
          <div className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md">
            $450
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="hidden md:flex absolute top-1/3 right-[5%] glass-panel p-4 rounded-2xl z-20 items-center gap-3 w-max rotate-[3deg] hover:rotate-0 transition-transform duration-300"
        >
          <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
            <Star className="w-5 h-5 fill-orange-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Top Rated</p>
            <p className="text-sm font-bold text-foreground">Bali Villa</p>
          </div>
          <div className="flex -space-x-2 ml-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white" />
            <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white" />
            <div className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">+5</div>
          </div>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0, y: 50 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.9 }}
           className="hidden md:flex absolute bottom-[20%] left-[15%] glass-panel p-3 rounded-2xl z-20 flex-col items-center gap-1 w-24"
        >
          <Calendar className="w-6 h-6 text-primary mb-1" />
          <span className="text-xs font-bold text-foreground">14 Days</span>
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="w-[70%] h-full bg-primary" />
          </div>
        </motion.div>

      </div>
    </section>
  );
}

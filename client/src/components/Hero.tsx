import { ArrowRight, MapPin, Star, Calendar, Plane } from "lucide-react";
import { motion } from "framer-motion";
import illustration from "@assets/generated_images/3d_pastel_travel_icons_composition.png";

export function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden pt-32 pb-40 px-6 flex flex-col items-center justify-center md:block">
      
      {/* Background Gradients */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-200/40 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        
        {/* Text Content */}
        <div className="flex-1 text-center lg:text-left z-10 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/60 backdrop-blur-sm mb-6 shadow-sm"
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
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0"
          >
            TripSage is your personal AI travel companion. From flights to hidden gems, we plan it all in seconds.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
          >
            <button className="bg-foreground text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
              Start Planning <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-white/50 backdrop-blur-md border border-white/60 text-foreground px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/80 transition-colors">
              View Demo
            </button>
          </motion.div>
        </div>

        {/* Hero Image / Illustration */}
        <div className="flex-1 relative w-full max-w-[600px] lg:h-[600px] flex items-center justify-center">
          
          {/* Central Image */}
          <motion.img 
            src={illustration} 
            alt="Travel Illustration" 
            className="w-full h-auto object-contain relative z-10 drop-shadow-2xl floating-animation"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />

          {/* Floating Glass Cards */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="absolute top-10 left-0 md:-left-10 glass-panel p-4 rounded-2xl z-20 flex items-center gap-3 w-max rotate-[-6deg] animate-pulse hover:rotate-0 transition-transform duration-300"
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
            className="absolute bottom-20 right-0 md:-right-5 glass-panel p-4 rounded-2xl z-20 flex items-center gap-3 w-max rotate-[3deg] hover:rotate-0 transition-transform duration-300"
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
             className="absolute bottom-0 left-10 glass-panel p-3 rounded-2xl z-20 flex flex-col items-center gap-1 w-24"
          >
            <Calendar className="w-6 h-6 text-primary mb-1" />
            <span className="text-xs font-bold text-foreground">14 Days</span>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="w-[70%] h-full bg-primary" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

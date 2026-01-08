import { Link } from "wouter";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-6 px-6 md:px-12 flex items-center justify-between bg-transparent">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="bg-primary text-white p-2 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
          <Plane className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <span className="font-display font-bold text-2xl tracking-tight text-foreground">
          TripSage
        </span>
      </Link>


      <div className="flex items-center gap-4">
        <Button variant="ghost" className="font-medium hidden sm:flex hover:bg-white/50">Log in</Button>
        <Button className="rounded-full px-6 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
          Sign Up
        </Button>
      </div>
    </nav>
  );
}

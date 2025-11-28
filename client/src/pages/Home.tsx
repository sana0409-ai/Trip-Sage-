import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ChatUI } from "@/components/ChatUI";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background selection:bg-primary/20">
      <Navbar />
      <main>
        <Hero />
      </main>
      <ChatUI />
    </div>
  );
}

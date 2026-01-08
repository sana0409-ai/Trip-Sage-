// src/app/work/page.tsx
import Image from "next/image";

export default function WorkPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Work</h1>

      {/* ---- Experience Card ---- */}
      <article className="mt-8 rounded-xl bg-white/40 backdrop-blur p-6 shadow">
        <header className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Verity Advisors</h2>
            <p className="text-sm text-zinc-700">AI Research Intern</p>
          </div>
          <span className="text-sm text-zinc-600 whitespace-nowrap">
            Mar 2025 – May 2025
          </span>
        </header>

        <p className="mt-4 text-sm leading-6 text-zinc-800">
          Contributed to applied research in AI/ML for quantitative finance. Designed and shipped
          end-to-end ML pipelines in <strong>Python</strong> using <strong>XGBoost</strong>,{" "}
          <strong>LSTM</strong>, and <strong>PyTorch</strong>; operationalized models with{" "}
          <strong>MLflow</strong>, <strong>GitHub Actions</strong>, <strong>Docker</strong>, and{" "}
          <strong>AWS</strong>. Worked with real-time APIs (IBKR, Unusual Whales), applied
          risk-aware evaluation, model calibration, and ensembles to improve reliability.
        </p>
      </article>

      {/* ---- Project Showcase ---- */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Featured Project</h2>

        {/* --- Multimodal Depression Analysis (reference layout) --- */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 rounded-xl bg-white/40 backdrop-blur p-6 shadow">
          {/* Left: single image in a fixed-height box */}
          <div className="md:col-span-1">
            <div className="relative w-full h-48 md:h-[300px] overflow-hidden rounded-lg">
              <Image
                src="/projects/mda.jpg"
                alt="Multimodal Depression Analysis preview"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Right: text */}
          <div className="md:col-span-2 flex flex-col">
            <h3 className="text-lg font-semibold">Multimodal Depression Analysis</h3>
            <p className="mt-2 text-sm text-zinc-800">
              Lightweight web app that screens depression signals using text/audio cues and simple
              heuristics. Includes a clean UI, real-time inputs, and a fast API backend. Deployed on
              Vercel and optimized for smooth UX.
            </p>

            <div className="mt-4">
              <a
                href="https://multimodal-depression-analysis.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-700"
              >
                Open Live App
              </a>
            </div>
          </div>
        </div>

        {/* --- TripSage AI Travel Assistant --- */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 rounded-xl bg-white/40 backdrop-blur p-6 shadow">
          {/* Left: single image */}
          <div className="md:col-span-1">
            <div className="relative w-full h-48 md:h-[300px] overflow-hidden rounded-lg">
              <Image
                src="/projects/tripsage.png"
                alt="TripSage AI Travel Assistant preview"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Right: text */}
          <div className="md:col-span-2 flex flex-col">
            <h3 className="text-lg font-semibold">TripSage AI Travel Assistant</h3>

            <p className="mt-2 text-sm text-zinc-800">
              AI-powered travel planning assistant built with Google Dialogflow CX and React. 
              Enables users to book flights, hotels, and rental cars through natural language 
              conversations with real-time API integrations for live pricing and availability.
            </p>

            <p className="mt-2 text-sm text-zinc-800">
              Features include intelligent trip itinerary generation, step-by-step booking flows, 
              and a beautiful chat interface with rich media cards. Integrates with Amadeus, 
              Booking.com, and Priceline APIs for comprehensive travel options.
              <span className="whitespace-nowrap"> Conversational AI &amp; Full-Stack Development.</span>
            </p>

            <div className="mt-4">
              <a
                href="https://trip-sage-re4sy11mq-sanas-projects-297ee677.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-700"
              >
                Open Live App
              </a>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}

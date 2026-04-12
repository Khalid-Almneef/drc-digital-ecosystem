export default function Home() {
  return (
    <div className="container mx-auto px-6 max-w-7xl flex flex-col gap-12">
      <section id="hero" className="min-h-[60vh] flex flex-col justify-center items-center text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">
          Innovate Beyond Limits
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8">
          Welcome to the digital home of the Drones & Robotics Club.
        </p>
      </section>
      
      {/* Placeholders for subsequent phases */}
      <section id="overview" className="min-h-screen"></section>
      <section id="hackathons" className="min-h-screen"></section>
      <section id="alumni" className="min-h-screen"></section>
    </div>
  );
}

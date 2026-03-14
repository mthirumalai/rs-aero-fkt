import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {

  return (
    <div>
      {/* Hero */}
      <section className="bg-primary text-white py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="font-display mb-4 tracking-widest uppercase whitespace-nowrap text-[clamp(1.8rem,5.5vw,4.5rem)]">
            RS Aero Fastest Known Times
          </h1>
          <p className="text-lg text-white/80 mb-8 font-sans">
            The definitive record of the fastest passages made by an RS Aero for classic sailing routes.
            <br />
            Got a route? Got a GPX track for that route? Let&apos;s put it in the books!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
              <Link href="/routes/submit">Submit a Route</Link>
            </Button>
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
              <Link href="/routes">Submit an FKT Attempt</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

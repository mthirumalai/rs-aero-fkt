import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Guidelines — RS Aero FKT",
};

export default function GuidelinesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Guidelines</h1>

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-semibold mb-4 pb-2 border-b">Submitting a Route</h2>
          <div className="prose prose-sm max-w-none space-y-4">
            <p>
              A route consists of a start point and an end point between which sailors
              compete for the fastest known time. Please make the two points easy to find
              so others can attempt it as well. So pick two buoys whose latitude, longitude coordinates
              are well known.
              Ideally, a route should be meaningful sailing challenge.
              The minimum sailing time for a route should be 20 minutes as a rough guideline.
              We welcome classic routes - e.g., the delta ditch run in the Bay Area.
            </p>
            <h3 className="font-semibold text-base">Two Ways to Submit</h3>
            <p>
              You can submit a route in two ways:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>📍 Manual Entry:</strong> Enter the start and end point coordinates
                directly if you know them.
              </li>
              <li>
                <strong>📂 GPX Upload:</strong> Upload a GPX track of the route and click
                on the map to select the exact start and end points from your track. This is
                ideal when you have a GPS recording but don&apos;t know the precise coordinates.
              </li>
            </ul>
            <h3 className="font-semibold text-base">Requirements</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Clear endpoints:</strong> Both the start and end point must have
                accurate GPS coordinates (latitude/longitude) to within a few metres.
                This is important because when others submit FKT attempts, we are going to check
                their GPX tracks against the start and end points you submitted so please be diligent.
                When using GPX upload, click precisely on the intended start/end waypoints.
              </li>
              <li>
                <strong>One-way:</strong> Routes are point-to-point only. There are no
                intermediate waypoints for now. 
		Round-trip or circular routes should be submitted
                as two separate routes.
		Please reach out to us if you need us to enhance the app to allow routes that include one or more waypoints.
              </li>
              <li>
                <strong>Country:</strong> Select the country where the route is located
                (or the country of the start point if it crosses a border).
              </li>
              <li>
                <strong>Admin approval:</strong> All routes are reviewed by an admin
                before going live. This ensures coordinate accuracy and prevents
                duplicate routes.
              </li>
            </ul>
            <div className="mt-4">
              <Button asChild>
                <Link href="/routes/submit">Submit a Route</Link>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 pb-2 border-b">Submitting an FKT Attempt</h2>
          <div className="prose prose-sm max-w-none space-y-4">
            <p>
              An FKT attempt is a verified record of sailing an approved route. 
              Records are maintained separately for each of the four RS Aero rig sizes:
              <strong> Aero 5, Aero 6, Aero 7, and Aero 9</strong>.
	      The FKT for a route and rig is awarded to the attempt with the fastest time.
            </p>
            <h3 className="font-semibold text-base">GPX Track Requirements</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>File format:</strong> GPX only (v1.0 or v1.1). Export from your
                GPS device or iPhone and upload into the app. You can also provide a link to 
		a record from RideWithGPS or Strava.
              </li>
              <li>
                <strong>Timestamps required:</strong> The GPX track must include
                timestamps (<code>&lt;time&gt;</code> elements) on track points.
                Without timestamps, duration cannot be calculated.
              </li>
              <li>
                <strong>Proximity validation:</strong> Your track must pass within
                <strong> 10 metres</strong> of both the route&apos;s start and end
                coordinates. The system checks this automatically.
              </li>
              <li>
                <strong>Duration:</strong> The FKT time is calculated from the first
                track point within 10m of the start to the first subsequent point
                within 10m of the end. Any time spent outside this window is ignored.
              </li>
              <li>
                <strong>Honesty:</strong> The FKT community is built on trust. Do not
                submit edited or fabricated tracks. Submitting false records will result
                in account removal.
              </li>
            </ul>
            <h3 className="font-semibold text-base">Conditions</h3>
            <p>
              While optional, recording wind speed and direction (mean and gusts)
              and any significant tidal/current information helps contextualise the
              record for future challengers.
            </p>
            <h3 className="font-semibold text-base">Rig Size</h3>
            <p>
              Select the rig size you were sailing during the attempt. Each rig size
              maintains its own separate FKT. If you sail the same route with different
              rigs, you can submit separate attempts for each.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/routes">Browse Routes to Attempt</Link>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 pb-2 border-b">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I submit an FKT for a route I didn't submit?",
                a: "Yes! You can submit FKT attempts for any approved route. You will have to provide the name of the sailor.",
              },
              {
                q: "Does the direction matter?",
                a: "The route is defined as start → end. Your GPX must pass the start point before the end point. We may add reverse-direction routes in the future.",
              },
              {
                q: "What if my GPS coordinates are slightly off?",
                a: "The 10-metre tolerance accounts for typical GPS accuracy. If your device has poor accuracy, try to position yourself as close to the defined waypoint as possible before starting.",
              },
              {
                q: "Can I submit an attempt I did in the past?",
                a: "Yes, as long as you have a GPX file with timestamps from that day.",
              },
            ].map((faq) => (
              <div key={faq.q} className="border rounded-lg p-4">
                <p className="font-medium mb-1">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

import { Search, MessageCircle, Users } from "lucide-react";

const actions = [
  {
    icon: Search,
    text: "Getting found through your Bizcivitas profile",
  },
  {
    icon: MessageCircle,
    text: "Joining targeted conversations and initiatives.",
  },
  {
    icon: Users,
    text: "Receiving relevant introductions and referrals",
  },
];

export default function StopWaiting() {
  return (
    <section className="py-16 px-6 md:px-12 lg:px-24 bg-light-blue">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Left - Phone mockup image */}
        <div className="flex-1 flex justify-center">
          <img
            src="/images/stop-waiting-phones.png"
            alt="BizCivitas App"
            className="w-full max-w-[500px] h-auto"
          />
        </div>

        {/* Right - Content */}
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-navy">
              Stop waiting passively to be discovered.
            </h2>
            <h2 className="text-2xl md:text-3xl font-bold text-green mt-2">
              Start:
            </h2>
          </div>

          <div className="space-y-5">
            {actions.map((action) => (
              <div key={action.text} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <action.icon className="w-5 h-5 text-green" />
                </div>
                <p className="text-gray-700 text-base md:text-lg">
                  {action.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

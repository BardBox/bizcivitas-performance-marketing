import {
  Globe,
  Radio,
  MessageSquare,
  BookOpen,
  Brain,
  Video,
  Lightbulb,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "BizConnect",
    desc: "Build global connections with like-minded business owners.",
  },
  {
    icon: Radio,
    title: "BizPulse",
    desc: "Get access to curated content - announcements, polls and spotlights.",
  },
  {
    icon: MessageSquare,
    title: "BizHub",
    desc: "Get access to community forums for open discussions.",
  },
  {
    icon: BookOpen,
    title: "Digital Business Directory",
    desc: "Get easily discovered by the right people who need what you offer.",
  },
  {
    icon: Brain,
    title: "AI Matchmaking",
    desc: "Get practical insights from peers.",
  },
  {
    icon: Video,
    title: "Workshops & Webinars",
    desc: "Get access to monthly workshops and stay up-to-date.",
  },
  {
    icon: Lightbulb,
    title: "Knowledge Hub",
    desc: "Get curated content from experienced professionals.",
  },
  {
    icon: TrendingUp,
    title: "Business Growth Resources",
    desc: "Get e-mail newsletters with latest industry insights.",
  },
];

export default function Membership() {
  return (
    <section className="py-16 px-6 md:px-12 lg:px-24 bg-navy text-white">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Left - Content */}
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-bold mb-10">
            What can you get from this
            <br />
            membership?
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Phone mockup image */}
        <div className="flex-1 flex justify-center">
          <img
            src="/images/membership-phones.png"
            alt="Membership Features"
            className="w-full max-w-[500px] h-auto"
          />
        </div>
      </div>
    </section>
  );
}

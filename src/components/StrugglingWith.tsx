const struggles = [
  {
    icon: "/images/icon-slow-networking.png",
    title: "Slow networking",
  },
  {
    icon: "/images/icon-passive-online.png",
    title: "Passive online presence",
  },
  {
    icon: "/images/icon-cold-outreach.png",
    title: "Cold outreach burnout",
  },
  {
    icon: "/images/icon-excessive-noise.png",
    title: "Excessive noise, no warm intros",
  },
];

export default function StrugglingWith() {
  return (
    <section className="py-16 px-6 md:px-12 lg:px-24 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-navy text-center mb-12">
          BizCivitas is for{" "}
          <span className="text-primary">YOU</span> if you&apos;re struggling
          with:
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {struggles.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center text-center gap-4"
            >
              <img
                src={item.icon}
                alt={item.title}
                className="w-16 h-16 object-contain"
              />
              <p className="text-sm md:text-base font-medium text-navy">
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

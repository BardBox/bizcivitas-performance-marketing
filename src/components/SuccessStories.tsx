
const testimonials = [
  {
    name: "Jaimi Panchal",
    image: "/images/jaimi.jpg",
    logo: "/images/jaimi-logo.jpg",
    quote: '"Has Received Rs.8,00,000/- Worth of Business."',
  },
  {
    name: "Deven Oza",
    image: "/images/deven.jpg",
    logo: "/images/jaimi-logo.jpg",
    quote: '"Has Received Rs. 4,00,000/- Worth of Business."',
  },
  {
    name: "Suraj Tanna",
    image: "/images/suraj.jpg",
    logo: "/images/suraj-logo.jpg",
    quote: '"Has Given Rs.10,00,000/- Worth of Business."',
  },
];

export default function SuccessStories() {
  return (
    <section className="py-16 px-6 md:px-12 lg:px-24 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-navy text-center mb-12">
          Our Members Success Stories
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Avatar */}
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100">
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Business Logo */}
              <div className="h-10 flex items-center justify-center mb-3">
                <img
                  src={t.logo}
                  alt={`${t.name} business logo`}
                  className="h-10 w-auto object-contain"
                />
              </div>

              <h3 className="font-semibold text-navy text-lg mb-1">
                {t.name}
              </h3>

              <p className="text-gray-500 text-sm leading-relaxed">
                {t.quote}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

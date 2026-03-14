const socials = [
  { icon: "/images/facebook.svg", href: "https://facebook.com/" },
  { icon: "/images/instagram.svg", href: "https://instagram.com/" },
  { icon: "/images/linkedin.svg", href: "https://linkedin.com/" },
  { icon: "/images/youtube.svg", href: "https://youtube.com/" },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white py-10 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
        {/* Logo */}
        <img
          src="/images/logo-footer.png"
          alt="BizCivitas"
          className="h-10 md:h-12 w-auto"
        />

        {/* Social Icons */}
        <div className="flex items-center gap-4">
          {socials.map((s, i) => (
            <a
              key={i}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <img src={s.icon} alt="social media icon" className="w-5 h-5" />
            </a>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-gray-400 text-sm">
          2026 Bizcivitas - All rights reserved
        </p>
      </div>
    </footer>
  );
}

const socials = [
  { icon: "/images/facebook.svg", href: "https://www.facebook.com/bizcivitas/" },
  { icon: "/images/instagram.svg", href: "https://www.instagram.com/bizcivitas/" },
  { icon: "/images/linkedin.svg", href: "https://www.linkedin.com/company/bizcivitas/" },
  { icon: "/images/youtube.svg", href: "https://www.youtube.com/@BizCivitas" },
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
        <p className="text-gray-400 text-sm text-center">
          ©{" "}
          <a
            href="https://www.thebardbox.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white transition-colors"
          >
            BardBox DigiGrowth LLP {new Date().getFullYear()}
          </a>
          , All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function Navbar() {
  return (
    <nav className="w-full py-4 px-6 md:px-12 flex items-center justify-between bg-white">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">B</span>
        </div>
        <span className="text-navy font-bold text-xl tracking-tight">
          BIZCIVITAS
        </span>
      </div>
    </nav>
  );
}

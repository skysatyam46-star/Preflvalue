import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-bold text-xl mb-4">
        S
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-[#526078] max-w-md mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="rounded-full bg-[#246BFD] hover:bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 transition-colors shadow-xs"
      >
        Return to StrangerLens
      </Link>
    </div>
  );
}

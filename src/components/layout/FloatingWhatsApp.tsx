const whatsappUrl =
  "https://api.whatsapp.com/send/?phone=96178835078&text&type=phone_number&app_absent=0";

export function FloatingWhatsApp() {
  return (
    <a
      aria-label="Contact Heaven Beauty on WhatsApp"
      className="fixed bottom-5 right-5 z-[60] grid h-16 w-16 place-items-center rounded-2xl bg-[#6ee85f] text-white shadow-[0_16px_36px_rgba(38,185,62,0.3)] transition duration-300 hover:-translate-y-1 hover:scale-105"
      href={whatsappUrl}
      rel="noreferrer"
      target="_blank"
    >
      <svg
        aria-hidden="true"
        className="h-11 w-11"
        fill="none"
        viewBox="0 0 48 48"
      >
        <path
          d="M10.2 38.3 12 31.6A16.5 16.5 0 1 1 18.6 38l-8.4.3Z"
          fill="currentColor"
        />
        <path
          d="M19.2 15.8c-.4-.9-.8-.9-1.2-.9h-1c-.3 0-.9.1-1.4.7-.5.6-1.8 1.8-1.8 4.3s1.8 4.9 2.1 5.2c.3.4 3.5 5.6 8.7 7.6 4.3 1.7 5.2 1.3 6.1 1.2.9-.1 3-1.2 3.4-2.4.4-1.2.4-2.2.3-2.4-.1-.2-.5-.4-1-.7l-3.4-1.7c-.5-.2-.9-.4-1.3.3-.4.6-1.5 1.7-1.8 2.1-.3.4-.7.4-1.2.1-.5-.2-2.2-.8-4.2-2.6-1.5-1.4-2.6-3.1-2.9-3.6-.3-.5 0-.8.2-1.1.2-.2.5-.6.7-.9.2-.3.3-.5.5-.9.2-.4.1-.7 0-1-.1-.2-1.2-2.9-1.6-4Z"
          fill="#6ee85f"
        />
      </svg>
    </a>
  );
}

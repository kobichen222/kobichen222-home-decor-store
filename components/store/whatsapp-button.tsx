import { getStoreSettings } from "@/features/cms/queries";

export async function WhatsAppButton() {
  const { business } = await getStoreSettings();
  const number = business.whatsapp?.replace(/\D/g, "");
  if (!number) return null;
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="שיחה בוואטסאפ"
      className="fixed bottom-5 start-5 z-30 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-soft transition-transform hover:scale-105"
    >
      <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15L2 22l5.1-1.5A9.94 9.94 0 1 0 12.04 2Zm0 1.8a8.14 8.14 0 1 1-4.3 15.05l-.3-.18-3 .88.9-2.92-.2-.31A8.14 8.14 0 0 1 12.04 3.8Zm-3.2 3.9c-.2 0-.5.07-.75.35-.26.28-1 .97-1 2.36s1.02 2.74 1.16 2.93c.14.18 1.98 3.15 4.88 4.3 2.4.95 2.9.76 3.42.71.52-.05 1.69-.69 1.93-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33-.28-.14-1.69-.83-1.95-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.28-.14-1.2-.44-2.29-1.41a8.6 8.6 0 0 1-1.58-1.97c-.17-.28-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.16.19-.28.28-.47.1-.19.05-.36-.02-.5-.07-.14-.63-1.55-.88-2.12-.22-.5-.45-.5-.63-.5Z" />
      </svg>
    </a>
  );
}

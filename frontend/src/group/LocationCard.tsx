import { Landmark, Clapperboard, PartyPopper } from "lucide-react";

export const LocationCard: React.FC<{ place_name: string, en_name: string | null,  address: string, categories: string[], website: string, hours: string }> = ({ place_name, en_name, address, categories, website, hours }) => {
  const hasTourism = categories.some(c => c.includes("tourism"));
  const hasEntertainment = categories.some(c => c.includes("entertainment"));
  const hasLeisure = categories.some(c => c.includes("leisure"));
  const icons = [
    hasTourism && { icon: Landmark, label: "Tourism" },
    hasEntertainment && { icon: Clapperboard, label: "Entertainment" },
    hasLeisure && { icon: PartyPopper, label: "Leisure" },
  ].filter(Boolean) as { icon: any; label: string }[];
  return (
    <div 
      className="relative border border-gray-300 bg-gray-50 hover:drop-shadow-lg 
                 rounded-3xl hover:scale-105 transition p-4 shrink-0 basis-[48%]"
      onClick={() => { window.location.href = website }}
    >

      {/* Icons in top-right */}
      {icons.length > 0 && (
        <div className="absolute top-2 right-2 flex gap-2">
          {icons.map(({ icon: Icon, label }, i) => (
            <div key={i} className="group relative">
              <Icon className="w-5 h-5 text-blue-700" />

              {/* Tooltip */}
              <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 
                              transition bg-black text-white text-xs px-2 py-1 rounded-lg 
                              pointer-events-none whitespace-nowrap">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      <h1 className="text-center text-2xl text-blue-950">{place_name}</h1>
      {en_name && <h2 className="text-center text-xl text-gray-600">{en_name}</h2>}
      <hr className="h-0.5 w-full bg-linear-to-r from-blue-950 to-purple-950 rounded mb-1"/>

      <p className="text-gray-500 text-sm">Address: {address}</p>
      <p className="text-gray-500 text-sm">Hours: {hours}</p>
      <p className="text-gray-500 text-sm">Website: {website}</p> 
    </div>
  );
};
import { api, apiFetch } from "@/utils/api_util";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
 import { LocationCard } from "./LocationCard";

export const LocationList: React.FC<{ location_name: string}> = ({location_name}) => {
  const [loading, setLoading] = useState(true);
  const [locationInfo, setLocationInfo] = useState(undefined)
  const nav = useNavigate()

  const load = async () => {
    if (!location_name) {
      nav("/error", { state: { message: "No location" } });
    }
    setLoading(true);

    try {
      const res = await apiFetch(`/places/${location_name}`);
      setLocationInfo(res.data.features)
      
    } catch (err) {
      nav("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
    } finally {
      setLoading(false);
    }
  }
  useEffect( () => {
    load()
  }, [location_name]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-6 bg-gray-300 rounded w-1/3"></div>
        <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 rounded w-full"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
      </div>
    );
  }

  return(
    <div>
      <div className="text-center text-4xl text-gray-950 font-bold mb-2">Things To Do: {location_name}</div>
      <div className="flex flex-wrap gap-10 justify-center">
        {locationInfo.map((location) => <LocationCard key={location.properties.formatted} 
          place_name={location.properties.name} 
          en_name={"name_international" in location.properties ? location.properties.name_international.en : null}
          address={location.properties.formatted}
          categories={location.properties.categories}
          website={location.properties.website}
          hours={location.properties.opening_hours} />
        )}
        </div>
    </div>
  )
}
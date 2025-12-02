import { api, apiFetch } from "@/utils/api_util";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
 import { LocationCard } from "./LocationCard";

export const LocationList: React.FC<{ location_name: string}> = ({location_name}) => {
  const [locationInfo, setLocationInfo] = useState(undefined)
  const nav = useNavigate()

  console.log(location_name)
  const load = async () => {
    if (!location_name) {
      nav("/error", { state: { message: "No location" } });
    }
    try {
      const res = await apiFetch(`/places/${location_name}`);
      setLocationInfo(res.data.features)
    } catch (err) {
      nav("/error", { state: { message: err instanceof Error ? err.message : String(err) } });
    }
  }
  useEffect( () => {
    load()
  }, [location_name]);

  if (!locationInfo) {
    return null
  }

  return(
    <div>
      <div className="text-center text-4xl text-gray-950 font-bold mb-2">Things To Do: {location_name}</div>
      <div className="flex flex-wrap -mx-2">
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
export const LocationCard: React.FC<{ place_name: string, en_name: string | null,  address: string, categories: string[], website: string, hours: string }> = ({ place_name, en_name, address, categories, website, hours }) => {
  return (
    <div className="border-gray-500 border w-1/2 bg-gray-50 hover:drop-shadow-lg mx-auto p-3 m-3 rounded-3xl hover:scale-105 transition"
      onClick={() =>{
        window.location.href = website
      }} 
    >
      <h1 className="text-center text-2xl text-blue-950">{place_name}</h1>
      {en_name && <h2 className="text-center text-xl text-gray-600">{en_name}</h2>}
      <hr className="h-0.5 w-full bg-linear-to-r from-blue-950 to-purple-950 rounded mb-1"/>

      <p className="text-gray-500 text-sm">Address: {address}</p>
      <p className="text-gray-500 text-sm">Hours: {hours}</p>
      <p className="text-gray-500 text-sm">Website: {website}</p> 
    </div>
  )
}
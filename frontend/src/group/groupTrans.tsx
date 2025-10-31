
import ListTransactions from "./ListofTransactions";
import { useLocation } from "react-router-dom";
function Grouptrans() {


  const location = useLocation();
  const groupid = location.state?.groupId;

  // const [Transactions,setTransactions ] = useState([]);
  // const Gettransactions = async () => {
  //   try {
  //     const res = await api.get(`/groups/${groupid}/transactions`)

  //     console.log("User data:", res.data);
  //     setTransactions(res.data);
  //   } 
  //   catch (error: any) 
  //   {
  //   console.error("User not authenticated");
  //   GoogleLogin()
  //   return null;
  //   }
  //   };
  // useEffect(() => {
  //   Gettransactions();
  // }, []);

   return (
   
    ListTransactions(groupid)
  );
 
 
}

export default Grouptrans

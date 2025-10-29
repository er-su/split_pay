
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import  getMe  from "./components/user"; // import your function
import  GoogleAuthButton  from "./components/googleauthbutton";
import { useNavigate } from "react-router-dom";


function App() {
  //  useEffect(() => {
  //   // getMe()
  //   //   .then(data => console.log("Groups:", data))
  //   //   .catch(err => console.error(err));
  // }, []); // <-- Empty deps = runs once when app loads
  const navigate = useNavigate();

  const Gotogrouppages = () => {
    navigate("/Grouppages");
  };

  const AddGroupForm = () => {
    navigate("/Groupform");
  };
  const handleCheckAuth = async () => {
    const data = await getMe();
    console.log("Result from getMe:", data);
  };

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <GoogleAuthButton />
        <button onClick={handleCheckAuth}>
        Get My Account Info
       </button>
       <button onClick={Gotogrouppages}>Gotogroups</button>
       <button onClick={AddGroupForm}>Create A group</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App

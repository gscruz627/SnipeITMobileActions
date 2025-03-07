import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import './App.css'
import { useSelector } from 'react-redux';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera } from '@capacitor/camera';
import cameraIcon from "./assets/camera.png"
import settingsIcon from "./assets/settings.png"
import scannerIcon from "./assets/scanner.png"
import { CapacitorHttp } from '@capacitor/core';

const Home = () => {
  const requestCameraPermission = async () => {
    try {
      const result = await Camera.requestPermissions();
      console.log(result);
    } catch (error) {
      console.error('Error requesting camera permission:', error);
    }
  };
  

  const SNIPE_IT_API_KEY = useSelector((state) => state.snipeItKey);
  const SNIPE_IT_API_URL = useSelector((state) => state.snipeItUrl);
  const LEADING_ONE = useSelector((state) => state.leadingOne);
  const ARCHIVED_ID = useSelector((state) => state.archivedId);
  const CHECKOUT_ID = useSelector((state) => state.checkoutId);
  const DELAY = useSelector((state) => state.delay);

  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [choice, setChoice] = useState("Move & Audit");
  const [successMessage, setSuccessMessage] = useState("");
  const [failureMessage, setFailureMessage] = useState("");
  const [checkOutOption, setCheckOutOption] = useState("User");
  const [readingFromCamera, setReadingFromCamera] = useState(false);
  const [locationField, setLocationField] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [resolvedLocation, setResolvedLocation] = useState("");
  const [activeTimeout, setActiveTimeout] = useState(false);
  const [resolvedCheckedOutLocation, setResolvedCheckedOutLocation] = useState("");
  const [checkoutField, setCheckoutField] = useState("");

  const submit = async ({data = null, e = null}) => {
    if(!SNIPE_IT_API_KEY || !SNIPE_IT_API_URL){
        setFailureMessage("You have not configured Snipe IT URL or API Key. Go to Settings and setup those first.")
        return;
    }
    if(e){
      e.preventDefault();
    }
    if (LEADING_ONE){
      stateRef.current.assetTag = stateRef.current.assetTag.substring(1);
    }
    if (stateRef.current.choice == "Move & Audit") {
      await moveAndAudit(data);
      return;
    } else if (stateRef.current.choice === "Move") {
      await move(data);
      return;
    } else if (stateRef.current.choice ==="Check In") {
      await checkIn(data);
      return;
    } else if (stateRef.current.choice === "Check Out"){
      await checkOut(data);
      return;
    } else if (stateRef.current.choice === "Deprecate") {
      await deprecate(data);
      return;
    }  else {
      await displayLocation(data);
    }
  }
  const resetState = () => {
    setActiveTimeout(true);
    setTimeout(() => {
        setActiveTimeout(false);
        setResolvedLocation("");
        setResolvedCheckedOutLocation("");
        setFailureMessage("");
        setSuccessMessage("");
        setCheckoutField("");
        setAssetTag("");
    }, DELAY * 1000);
};

  const fetchData = async (url, method = "GET", body = null) => {
    let request;
    try{
      request = await CapacitorHttp.request({
        method: method,
        url: url,
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json",
          "Authorization": `Bearer ${SNIPE_IT_API_KEY}`,
        },
        data: body ? body : null
      })
    } catch(error) {
      setFailureMessage("Something Went Wrong with the Request. Try again. Error: " + error);
      resetState();
      return null;
    }
    if (request.status >= 400 && request.status <= 599){
      setFailureMessage(`Request Failed with code: ${request.status}. Try again.`);
      resetState();
      return null;
    }
    const response = request.data;
    return response;
  };

  const checkExistance = (response, tag=null, kind) => {
    if(kind === "asset"){
        if (response.status === "error") {
            setFailureMessage(`Asset with Tag: ${tag} does not exist.`);
                resetState();
                return false;
        }
        return true;
    } else {
        if(response.total === 0){
            setFailureMessage(`${kind}: ${tag} does not exist.`)
            resetState();
            return;
          }
        return true;
    }
  }
  const displayLocation = async (data = null) => {
    const tag = data || stateRef.current.assetTag; 
    const response = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/bytag/${tag}`, "GET")
    if (!checkExistance(response, tag, "asset")){ return }
    if (!response.location && !(response.assigned_to && response.assigned_to.type === "location")) {
        setFailureMessage(`Asset with Name: ${response.name ? response.name : response.serial} does not have a location set up nor is it checked out to a location.`);
        resetState();
        return;
    }
    if (response.assigned_to && response.assigned_to.type === "location") {
        setResolvedCheckedOutLocation(response.assigned_to.name);
    }
    if (response.location) {
        setResolvedLocation(response.location.name);
    }
    setSuccessMessage("Location Found");
    resetState();
};

  const deprecate = async (data = null) => {
    const tag = data || stateRef.current.assetTag; 
    const response = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/bytag/${tag}`, "GET");
    if (!checkExistance(response, tag, "asset")){return;}

    // Proceed with the Deprecate Request
    const assetId = response.id;
    const deprecateResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/${assetId}`, "PATCH", JSON.stringify({"status_id" : ARCHIVED_ID})) // Archived.
    if(deprecateResponse){
        setSuccessMessage(`Asset with name: ${response.name ? response.name : response.serial} was archived.`)
    }
    resetState();
    return;
  }

  const checkIn = async (data = null) => {
    const tag = data || stateRef.current.assetTag; 
    const response = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/bytag/${tag}`, "GET")
    if (!checkExistance(response, tag, "asset")){return}
    
    // Proceed with the Location Find Request
    const assetId = response.id;
    const location = stateRef.current.locationField;
    const locationResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/locations?search=${location}`, "GET");
    if(!checkExistance(locationResponse, location, "Location")){return}

    // Proceed with Check In Request
    const checkinResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/${assetId}/checkin`, "POST", JSON.stringify({"status_id": CHECKOUT_ID,"location_id": locationResponse.rows[0].id}))
    if(!checkinResponse){return}
    setSuccessMessage(`Checked In Asset with name: ${response.name ? response.name : response.serial} to Location: ${locationResponse.rows[0].name}.`)
    resetState();
    return;
  }

  const move = async (data = null) => {
    const tag = data || stateRef.current.assetTag; 
    const response = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/bytag/${tag}`, "GET")
    if (!checkExistance(response, tag, "asset")){ return }
    
    // Proceed with the Location Find Request
    const assetId = response.id;
    const location = stateRef.current.locationField;
    const locationResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/locations?search=${location}`, "GET");
    if(!checkExistance(locationResponse, location, "Location")){return}
    
    // Proceed with the Move request
    const moveResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/${assetId}`, "PATCH", JSON.stringify({"location_id" : locationResponse.rows[0].id}))
    if(!moveResponse){return}
    setSuccessMessage(`Moved Asset with name: ${response.name ? response.name : response.serial} to Location: ${locationResponse.rows[0].name}.`)
    resetState();
    return;

  }

  const moveAndAudit = async (data = null) => {
    const tag = data || stateRef.current.assetTag; 
    const response = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/bytag/${tag}`, "GET")
    if (!checkExistance(response, tag, "asset")){ return }
    
    // Proceed with the Location Find Request
    const assetId = response.id;
    const location = stateRef.current.locationField;
    const locationResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/locations?search=${location}`, "GET");
    if(!checkExistance(locationResponse, location, "Location")){return}
    
    // Proceed with the Move request
    const moveResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/${assetId}`, "PATCH", JSON.stringify({"location_id" : locationResponse.rows[0].id}))
    if(!moveResponse){return;}

    // Proceed with the Audit Request
    const auditResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/audit`, "POST", JSON.stringify({"asset_tag": tag,"location_id": locationResponse.rows[0].id}))
    if(!auditResponse){return}
    setSuccessMessage(`Moved and Audited Asset with name: ${response.name ? response.name : response.serial} to Location: ${locationResponse.rows[0].name}.`)
    resetState();
  }

  const checkOut = async (data = null) => {
      const tag = data || stateRef.current.assetTag; 
      const response = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/bytag/${tag}`, "GET")
      if (!checkExistance(response, tag, "asset")){ return }
      
      // Choose to user or to location
      const assetId = response.id;
      const option = stateRef.current.checkOutOption;
      let locationResponse = null, userResponse = null;
      if(option === "Location"){
          const location = stateRef.current.checkoutField;
          locationResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/locations?search=${location}`, "GET");
          if(!checkExistance(locationResponse, location, "Location")){return}
    } else {
        const user = stateRef.current.checkoutField;
        userResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/users?search=${user}`, "GET");
        if(!checkExistance(userResponse, user, "User")){return}
    }

    // Proceed with checkout request
    const checkoutResponse = await fetchData(`${SNIPE_IT_API_URL}/api/v1/hardware/${assetId}/checkout`, "POST", JSON.stringify({
        "status_id": CHECKOUT_ID,
        "checkout_to_type": option.toLowerCase(),
        "assigned_user": (option === "User") ? userResponse.rows[0].id : null,
        "assigned_location" : (option === "Location") ? locationResponse.rows[0].id : null
      }));
    if(!checkoutResponse){return}
    setSuccessMessage(`Checked Out Asset with name: ${response.name ? response.name : response.serial} to: ${option === "User" ? userResponse.rows[0].name : locationResponse.rows[0].name}.`)
    resetState();
    return;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const [scanning, setScanning] = useState(false);
  const codeReader = useRef(new BrowserMultiFormatReader()).current;

  const startCamera = async () => {
    try {
      const constraints = { video: {facingMode: "environment" }};
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stateRef = useRef({ choice, checkOutOption, checkoutField, locationField, assetTag: null });

  // Update stateRef whenever any relevant state changes
  useEffect(() => {
    stateRef.current = { choice, checkOutOption, checkoutField, locationField, assetTag };
  }, [choice, checkOutOption, checkoutField, locationField, assetTag]);

  // Camera Scanning workings.
  const startScanning = async () => {
    if (!scanning || !videoRef.current) return;
  
    try {
        await codeReader.decodeFromVideoDevice(null, videoRef.current, async (result, error) => {
          if (result) {
            const scannedCode = result.getText();
            stateRef.current.assetTag = scannedCode;
            codeReader.reset();
            setScanning(false);
  
            // Wait before restarting scanning
            submit({ data: null, e: null });
            await sleep(DELAY * 1000);
            setScanning(true);
          }
        });
    } catch (err) {
      console.error("Error starting scanner:", err);
    }
  };
  
  useEffect(() => {
    requestCameraPermission();
  }, []);
  
  useEffect(() => {
    if (readingFromCamera) {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      startCamera();
    } else {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    }
  }, [readingFromCamera]);
  
  useEffect(() => {
    if (scanning) {
      startScanning();
    }
    return () => {
      codeReader.reset();
    };
  }, [scanning]);
  
  
  return (
    <div>
      <header>
        <Link to="/"><h2><strong style={{color: "#333"}}>Snipe IT</strong> Mobile Actions</h2></Link>
        <div style={{display: "flex", flexDirection: "row", columnGap: "15px"}}>
            <div onClick={() => setReadingFromCamera(!readingFromCamera)} className="choice-icon" style={{backgroundColor: readingFromCamera ? "#39CCCC" : "#FF851B" }}>
            {readingFromCamera ? 
                <img src={cameraIcon}></img>
                : 
                <img src={scannerIcon}></img>
            }
            </div>
            <div onClick={() => navigate("/settings")} className="choice-icon" style={{backgroundColor: "#888"}}>
                <img src={settingsIcon}></img>
            </div>
        </div>
      </header>
      <nav>
      <ul>
          <li onClick={() => setChoice("Move & Audit")} style={{backgroundColor: "#39CCCC"}}>Move & Audit</li>
          <li onClick={() => setChoice("Move")} style={{backgroundColor: "#FF851B"}}>Move (No Audit)</li>
          <li onClick={() => setChoice("Check In")} style={{backgroundColor: "#605ca8"}}>Check In</li>
          <li onClick={() => setChoice("Check Out")} style={{backgroundColor: "#F39C12"}}>Check Out</li>
          <li onClick={() => setChoice("Deprecate")} style={{backgroundColor: "#D81B60"}}>Deprecate</li>
          <li onClick={() => setChoice("Display Location")} style={{backgroundColor: "#39CCCC"}}>Display Location</li>
        </ul>
      </nav>
      <section>
        <h2>{choice}</h2>

        { (successMessage !== "") && 
          <div className="success-box"> <strong>&#10003; Success: </strong>{successMessage}</div>
        }

        { (failureMessage !== "") &&
          <div className="error-box"> <strong>&#9888; Error: </strong>{failureMessage}</div>
        }

        { ((choice === "Move & Audit") || (choice === "Move") || (choice === "Check In")) &&
          <div>
            <label htmlFor="locationField">Location: </label><br/>
            <input onChange={(e) => setLocationField(e.target.value)} value={locationField} type="text" id="locationField"></input>
          </div>
        }

        { choice == "Check Out" && 
          <div>
            <h4 style={{textAlign: "center"}}>Checkout to:</h4>

            <div id="btn-group">
              <button className={checkOutOption === "User" && "selected"} onClick={() => setCheckOutOption("User")}>&#128100; User</button>
              <button className={checkOutOption === "Location" && "selected"}onClick={() => setCheckOutOption("Location")}>&#128205; Location</button>
            </div>

            <label htmlFor="selection-checkout">Select {checkOutOption}: </label><br/>
            <input onChange={(e) => setCheckoutField(e.target.value)} value={checkoutField} type="text" placeholder={checkOutOption === "User" ? "Username" : "Location"}></input>
          </div>
        }

            <div style={{display: (!readingFromCamera || activeTimeout) ? "none" : "block", width: "min(80%, 650px)"}}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: 'auto', border: '1px solid #ccc' }}></video>
            </div>
        {!activeTimeout ? (
          !readingFromCamera && (
              <form onSubmit={(e) => {
                e.preventDefault(); // Prevent default form submission behavior
                stateRef.current.assetTag = assetTag;
                submit({ e: e, data: null }); // Proceed with the submit
              }} style={{marginTop: "15px"}}>
                <input onChange={(e) => setAssetTag(e.target.value)} value={assetTag} type="text" placeholder="Click Here to Scan"></input>
              </form>
          )
        ) : <h3>Wait...</h3>}

        {(resolvedLocation != "") && (
          <div className='info-box'>
            <div><strong>Default Location: </strong></div>
            <p>{resolvedLocation}</p>
          </div>
        )}

        {(resolvedCheckedOutLocation != "") && (
          <div className='info-box'>
            <div><strong>Checked Out to Location: </strong></div>
            <p>{resolvedCheckedOutLocation}</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default Home
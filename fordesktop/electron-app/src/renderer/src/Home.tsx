import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import './App.css'
import { BrowserMultiFormatReader} from '@zxing/browser';
import type { Result, Exception } from '@zxing/library';

enum ScanChoice{
  MoveAndAudit = "Move & Audit",
  Move = "Move",
  CheckIn = "Check In",
  CheckOut = "Check Out",
  Archive = "Archive",
  Location = "Display Location"
}

enum CheckOutChoice{
  User = "User",
  Location = "Location",
  Asset = "Asset"
}

type assetTagState = "idle" | "ready" | "wait"

function Home(){
  // Get the settings values
  const snipeItApiKey: string = localStorage.getItem('snipe-it-key') ?? '';
  const snipeItApiUrl: string = localStorage.getItem('snipe-it-api-url') ?? '';
  const leadingOne: string = localStorage.getItem('leading-one') ?? '';
  const archivedId: string = localStorage.getItem('archived-id') ?? '';
  const checkOutId: string = localStorage.getItem('check-out-id') ?? '';
  const delay: number = Number(localStorage.getItem('delay')) || 0;
  const auditWaitTime: number = Number(localStorage.getItem('audit-wait-time')) ?? 0;

  // Video Reference for the <video> element that will display the camera feed.
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[] | never[]>([])
  const [cameraIndex, setCameraIndex] = useState(0);
  const [scanning, setScanning] = useState<boolean>(false);

  // codeReader object from ZXing.
  const codeReader = new BrowserMultiFormatReader();
  const navigate = useNavigate();
  const [readingFromCamera, setReadingFromCamera] = useState<boolean>(false);

  // choice selector and messages
  const [choice, setChoice] = useState<ScanChoice>(ScanChoice.MoveAndAudit);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [failureMessage, setFailureMessage] = useState<string>("");
  
  // Options (Check out selection, locations, assetTag, etc.)
  const [checkOutOption, setCheckOutOption] = useState<string>("User");
  const [assetTagFocused, setAssetTagFocused] = useState<assetTagState>("idle");

  const locationRef = useRef<HTMLInputElement>(null);
  const checkoutRef = useRef<HTMLInputElement>(null);
  const assetTagRef = useRef<HTMLInputElement>(null);
  const [resolvedLocation, setResolvedLocation] = useState("");
  const [activeTimeout, setActiveTimeout] = useState(false);
  const [resolvedCheckedOutLocation, setResolvedCheckedOutLocation] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement> | null){

    if(event){ event.preventDefault(); }

    // If leading one is set on the settings, substring starting at 1.
    if ((leadingOne === "true") && assetTagRef.current?.value) {
      assetTagRef.current.value = assetTagRef.current.value.substring(1);
    }
    
    // Run different functions depending on the choice.
    switch (choice) {
      case ScanChoice.MoveAndAudit: await moveAndAudit(); break;
      case ScanChoice.Move: await move(); break;
      case ScanChoice.CheckIn: await checkIn(); break;
      case ScanChoice.CheckOut: await checkOut(); break;
      case ScanChoice.Archive: await archive(); break;
      case ScanChoice.Location: await displayLocation(); break;
      default: alert("failed"); 
    }
  }

  function resetState(): void{
    console.log('im running')
    setActiveTimeout(true);
    setTimeout(() => {
        setActiveTimeout(false);
        setResolvedLocation("");
        setResolvedCheckedOutLocation("");
        setFailureMessage("");
        setSuccessMessage("");
        hasScanned = false;
        console.log('running v2')
        if (readingFromCamera){ setScanning(true); console.log('true to thisreading')} else { console.log("nottoo this")}
        if (assetTagRef.current) { assetTagRef.current.value = ""; }
    }, delay * 1000);
  };

  async function fetchData(url: string, method:string = "GET", body: string | null = null){
    let request;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "Authorization": `Bearer ${snipeItApiKey}`,
      },
    };

    // Only include body if method is not GET
    if (method !== "GET" && body !== null) {
      options.body = body;
    }

    try {
      request = await fetch(url, options);
    } catch (error: any) {
      setFailureMessage(`Something Went Wrong with the Request. Error Code: ${error.message}`);
      console.log(error);
      resetState();
      return null;
    }
  
    if (!request.ok) {
      setFailureMessage(`Request Failed with code: ${request.status}. Try again.`);
      resetState();
      return null;
    }

    const response = await request.json()
  
    return response;
  };


  async function checkExistance(response: any /* JSON Object */, tag: string | null =null, kind: string){
    // Check for asset existance before anything else is done
    // If the kind of device is assetTag we also display the tag
    // This is both for checking the existance of an asset (computer or device), or some other
    // Asset or even a location, in which case Location: {Location} does not exist will
    // be displayed, so 'tag' is not very specific, is both for the location and the tag.
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

  async function displayLocation(){
    const tag: string = assetTagRef.current?.value ?? ""
    const response = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${tag}`, "GET")
    if (!checkExistance(response, tag, "asset")){ return }
    // if a an asset does not have a 'default location' and the response's assigned_to field 
    // is set to type location, then this asset just does not have a location.
    if (!response.location && !(response.assigned_to && response.assigned_to.type === "location")) {
        setFailureMessage(`Asset with Name: ${response.name ? response.name : response.serial} does not have a location set up nor is it checked out to a location.`);
        resetState();
        return;
    }
    // if however, this asset is checked out to a location and a location exist, then display it.
    if (response.assigned_to && response.assigned_to.type === "location") {
        setResolvedCheckedOutLocation(response.assigned_to.name);
    }
    // if the asset has a default location also display it.
    if (response.location) {
        setResolvedLocation(response.location.name);
    }
    setSuccessMessage("Location Found");
    resetState();
};

  async function archive(){
    const tag: string = assetTagRef.current?.value ?? ""; 
    const response = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${tag}`, "GET");
    if (!checkExistance(response, tag, "asset")){return;}

    // Proceed with the Archive Request
    const assetId = response.id;
    const archiveResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/${assetId}`, "PATCH", JSON.stringify({"status_id" : archivedId})) // Archived.
    if(archiveResponse){
        setSuccessMessage(`Asset with name: ${response.name ? response.name : response.serial} was archived.`)
    }
    resetState();
    return;
  }

  async function checkIn(){
    const tag: string = assetTagRef.current?.value ?? ""; 
    const response = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${tag}`, "GET")
    if (!checkExistance(response, tag, "asset")){return}
    
    // Proceed with the Location Find Request
    const assetId = response.id;
    const location: string = locationRef.current?.value ?? "";
    const locationResponse = await fetchData(`${snipeItApiUrl}/api/v1/locations?search=${location}`, "GET");
    if(!checkExistance(locationResponse, location, "Location")){return}

    // Proceed with Check In Request
    const checkinResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/${assetId}/checkin`, "POST", JSON.stringify({"status_id": checkOutId,"location_id": locationResponse.rows[0].id}))
    if(!checkinResponse){return}
    setSuccessMessage(`Checked In Asset with name: ${response.name ? response.name : response.serial} to Location: ${locationResponse.rows[0].name}.`)
    resetState();
    return;
  }

  async function move(){
    const tag: string = assetTagRef.current?.value ?? ""; 
    const response = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${tag}`, "GET")
    if (!checkExistance(response, tag, "asset")){ return }
    
    // Proceed with the Location Find Request
    const assetId = response.id;
    const location: string = locationRef.current?.value ?? "";
    const locationResponse = await fetchData(`${snipeItApiUrl}/api/v1/locations?search=${location}`, "GET");
    if(!checkExistance(locationResponse, location, "Location")){return}
    
    // Proceed with the Move request
    const moveResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/${assetId}`, "PATCH", JSON.stringify({"location_id" : locationResponse.rows[0].id}))
    if(!moveResponse){return}
    setSuccessMessage(`Moved Asset with name: ${response.name ? response.name : response.serial} to Location: ${locationResponse.rows[0].name}.`)
    resetState();
    return;
  }

  async function moveAndAudit(){
    const tag: string = assetTagRef.current?.value ?? ""; 
    const response = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${tag}`, "GET")
    if (!checkExistance(response, tag, "asset")){ return }
    
    // Proceed with the Location Find Request
    const assetId = response.id;
    const location: string = locationRef.current?.value ?? "";
    const locationResponse = await fetchData(`${snipeItApiUrl}/api/v1/locations?search=${location}`, "GET");
    if(!checkExistance(locationResponse, location, "Location")){return}
    
    // Proceed with the Move request
    const moveResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/${assetId}`, "PATCH", JSON.stringify({"location_id" : locationResponse.rows[0].id}))
    if(!moveResponse){return;}

    // Proceed with the Audit Request
    const nextAuditDate = new Date(new Date().setFullYear(new Date().getFullYear() + auditWaitTime)).toISOString().split('T')[0];
    const auditResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/audit`, "POST", JSON.stringify({"asset_tag": tag,"location_id": locationResponse.rows[0].id, "next_audit_date":nextAuditDate}))
    if(!auditResponse){return}
    setSuccessMessage(`Moved and Audited Asset with name: ${response.name ? response.name : response.serial} to Location: ${locationResponse.rows[0].name}.`)
    resetState();
  }

  async function checkOut(){
      const tag: string = assetTagRef.current?.value ?? ""; 
      const response = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${tag}`, "GET")
      if (!checkExistance(response, tag, "asset")){ return }
      
      // Choose to user or to location and check either of their existence.
      const assetId = response.id;
      let locationResponse = null, userResponse = null, assetResponse = null;
      if(checkOutOption === "Location"){
          const location = checkoutRef.current?.value;
          locationResponse = await fetchData(`${snipeItApiUrl}/api/v1/locations?search=${location}`, "GET");
          if(!checkExistance(locationResponse, location, "Location")){return}
      } else if(checkOutOption === "Asset"){
        const sourceAssetTag = checkoutRef.current?.value;
        assetResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${sourceAssetTag}`, "GET")
        if(!checkExistance(response, sourceAssetTag, "asset")) { return }
      }      
      else {
          const user = checkoutRef.current?.value;
          userResponse = await fetchData(`${snipeItApiUrl}/api/v1/users?search=${user}`, "GET");
          if(!checkExistance(userResponse, user, "User")){return}
      }

    // Proceed with checkout request
    const checkoutResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/${assetId}/checkout`, "POST", JSON.stringify({
        "status_id": checkOutId,
        "checkout_to_type": checkOutOption.toLowerCase(),
        "assigned_user": (checkOutOption === "User") ? userResponse.rows[0].id : null,
        "assigned_location" : (checkOutOption === "Location") ? locationResponse.rows[0].id : null,
        "assigned_asset" : (checkOutOption === "Asset") ? assetResponse.id : null
      }));
    if(!checkoutResponse){return}
    let targetName = "Unknown";

    if (checkOutOption === "User") {
      targetName = userResponse.rows[0].name;
    } else if (checkOutOption === "Location") {
      targetName = locationResponse.rows[0].name;
    } else if (checkOutOption === "Asset") {
      targetName = assetResponse.name;
}

setSuccessMessage(`Checked Out Asset with name: ${response.name ? response.name : response.serial} to: ${targetName}.`);
    resetState();
    return;
  }

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function handleGetFocus(){
    assetTagRef.current?.focus();
  }
  /*
  const [scanning, setScanning] = useState(false);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [cameras, setCameras] = useState([]);
const codeReader = useRef(new BrowserMultiFormatReader()).current;


  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
      setCameras(videoDevices);
    } catch (error) {
      console.error("Error listing cameras:", error);
    }
  };
  const startCamera = async (deviceId = null) => {
    try {
      const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stateRef = useRef({ choice, checkOutOption, checkoutField, locationRef.current?.value ?? "", assetTag: null });

  // Update stateRef whenever any relevant state changes
  useEffect(() => {
    stateRef.current = { choice, checkOutOption, checkoutField, locationField, assetTag };
  }, [choice, checkOutOption, checkoutField, locationField, assetTag]);

  // Camera Scanning workings.
  const startScanning = async () => {
    if (!scanning || !videoRef.current || cameras.length === 0) return;
  
    try {
      const deviceId = cameras[currentCameraIndex]?.deviceId;
      if (deviceId) {
        await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, async (result, error) => {
          if (result) {
            const scannedCode = result.getText();
            stateRef.current.assetTag = scannedCode;
            codeReader.reset();
            setScanning(false);
  
            // Wait before restarting scanning
            await handleSubmit(null);
            await sleep(DELAY * 1000);
            setScanning(true);
          }
        });
      }
    } catch (err) {
      console.error("Error starting scanner:", err);
    }
  };
  
  const switchCamera = async () => {
    if (cameras.length > 1) {
      const nextIndex = (currentCameraIndex + 1) % cameras.length;
      setCurrentCameraIndex(nextIndex);
      startCamera(cameras[nextIndex].deviceId);
    }
  };
  
  useEffect(() => {
    getCameras();
  }, []);
  
  useEffect(() => {
    if (readingFromCamera) {
      startCamera(cameras[currentCameraIndex]?.deviceId);
    } else {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    }
  }, [readingFromCamera, currentCameraIndex]);
  
  useEffect(() => {
    if (scanning) {
      startScanning();
    }
    return () => {
      codeReader.reset();
    };
  }, [scanning, currentCameraIndex]);
  */
let currentScanner: any = null;
let hasScanned: boolean = false;
async function startBarcodeScanner(deviceId: string) {
  if(!scanning){
    return;
  }
  if(currentScanner){
    console.log("stopping previous scanner");
    currentScanner.stop();
    currentScanner = null;
  } else {
    console.log("no scanner");
  }

  hasScanned = false;
  codeReader.decodeFromVideoDevice(
    deviceId,
    'video',
    async (
      result: Result | undefined,
      error: Exception | undefined,
      controls: any
    ) => {
      if(!currentScanner){
        currentScanner = controls;
      }
      if (result && !hasScanned) {
        hasScanned = true;
        setScanning(false);
        console.log(result);
        controls.stop();
        currentScanner = null;
        resetState();
      }
    }
  );
}

function stopCameraCurrent(){
  const video = document.querySelector("video");
  if(video?.srcObject){
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach( (track) => track.stop());
    video.srcObject = null;
  }
}

function getCameras() {
  const video = document.querySelector("video")!;
  let tempStream: MediaStream;

  return navigator.mediaDevices.getUserMedia({video: true})
    .then((stream) => {
      tempStream = stream;
      video.srcObject = stream;

      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(video);
        };
      });
    })
    .then((video: any) => {
      return video.play()
        .then(() => {
          return navigator.mediaDevices.enumerateDevices();
        });
    })
    .then((devices) => {
      const videoInputs = devices.filter((d:any) => d.kind === "videoinput");

      tempStream.getTracks().forEach( (track) => track.stop());

      setCameras(videoInputs);
      setCameraIndex(0);
      return videoInputs;
    });
}

  function stopCamera() {
    const video = document.querySelector("video")!;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
  }

function switchCameras(){
  setCameraIndex((prev) => (prev + 1) % cameras.length);
}

useEffect(() => {
  if(cameras.length > 0){
    startBarcodeScanner(cameras[cameraIndex].deviceId);
  }
}, [cameras])


useEffect(() => {
  console.log(scanning);
  if(cameras.length !== 0 && cameraIndex != null){
    stopCameraCurrent();
    startBarcodeScanner(cameras[cameraIndex].deviceId);
  }
}, [cameraIndex, scanning])


useEffect(() => {
  console.log("hi")
  function callGetCameras(){
    getCameras();
  }
  function callStopCamera(){
    stopCamera();
  }

  if (readingFromCamera) {
    console.log("cameras: true");
    setScanning(true);
    callGetCameras();
  } else {
    console.log('cameras false');
    callStopCamera();
  }

}, [readingFromCamera]);

  return (
    <div>
    <button onClick={switchCameras}>switch camera</button>

      <header>

        <Link to="/"><h2><strong style={{color: "#333"}}>Snipe IT</strong> Actions</h2></Link>

        <div style={{display: "flex", flexDirection: "row", columnGap: "15px"}}>
            <div onClick={() => setReadingFromCamera(!readingFromCamera)} className="choice-icon">
            
              {/* Show Switch to Camera or Switch to Barcode reader mode*/}
              {readingFromCamera ? 
                  <i className="fa-solid fa-barcode"></i>
                  : 
                  <i className="fa-solid fa-camera"></i>
              }

            </div>

    {/*        {/* If reading from camera show the flip camera icon}
            {readingFromCamera &&
            <div onClick={() => switchCamera()} className='choice-icon' style={{width: "70px"}}>
                <i className="fa-solid fa-camera-rotate"></i>
                <h3><strong>{currentCameraIndex}</strong></h3>
            </div>
            } */}

            {/* Link to settings page*/}
            <div onClick={() => navigate("/settings")} className="choice-icon">
                <i className="fa-solid fa-gear"></i>
            </div>
        </div>
      </header>
      <nav>
      <ul>
          <li onClick={() => setChoice(ScanChoice.MoveAndAudit)} style={{backgroundColor: "#39CCCC"}}>Move & Audit</li>
          <li onClick={() => setChoice(ScanChoice.Move)} style={{backgroundColor: "#FF851B"}}>Move (No Audit)</li>
          <li onClick={() => setChoice(ScanChoice.CheckIn)} style={{backgroundColor: "#605ca8"}}>Check In</li>
          <li onClick={() => setChoice(ScanChoice.CheckOut)} style={{backgroundColor: "#F39C12"}}>Check Out</li>
          <li onClick={() => setChoice(ScanChoice.Archive)} style={{backgroundColor: "#D81B60"}}>Archive</li>
          <li onClick={() => setChoice(ScanChoice.Location)} style={{backgroundColor: "#39CCCC"}}>Display Location</li>
        </ul>
      </nav>
      {(snipeItApiKey === "" || snipeItApiUrl === "" || archivedId === "" || checkOutId === "" || delay === 0 || auditWaitTime === 0) ?
      
      <section className="center-box" style={{backgroundColor: "#FFDAE0", borderColor: "#BD6C6C"}}>
        <i className="fa-solid fa-triangle-exclamation"></i>
        <p>You have not configured all fields in the Settings, please go to the settings page (top right gear icon) and fill all fields.</p>
      </section> :
      <section>

        <h2>{choice}</h2>

        {/* Show success or failure messages if needed */}
        { (successMessage !== "") && 
          <div className="success-box"> <strong>&#10003; Success: </strong>{successMessage}</div>
        }

        { (failureMessage !== "") &&
          <div className="error-box"> <strong>&#9888; Error: </strong>{failureMessage}</div>
        }

        { [ScanChoice.MoveAndAudit, ScanChoice.Move, ScanChoice.CheckIn].includes(choice) &&
          <div>
            <label htmlFor="locationField">Location: </label><br/>
            <input type="text" id="locationField" ref={locationRef}/>
          </div>
        }

        { choice === ScanChoice.CheckOut && 
          <div>
            <h4 style={{textAlign: "center"}}>Checkout To:</h4>

            <div id="btn-group">
              <button className={checkOutOption === "User" ? "selected" : undefined} onClick={() => setCheckOutOption("User")}>
                <i className="fa-solid fa-user"></i> User
              </button>
              <button className={checkOutOption === "Location" ? "selected" : undefined} onClick={() => setCheckOutOption("Location")}>
                <i className="fa-solid fa-location-dot"></i> Location
              </button>
              <button className={checkOutOption === "Asset" ? "selected" : undefined} onClick={() => setCheckOutOption("Asset")}>
                <i className="fa-solid fa-barcode"></i> Asset (AssetTag)
              </button>
            </div>

            <div>
              <label htmlFor="selection-checkout">Select {checkOutOption}: </label><br/>
              <input type="text" ref={checkoutRef}></input>
            </div>
          </div>
        }

        {/* Camera Feed */}
        <div style={{display: (!readingFromCamera || activeTimeout) ? "none" : "block", width: "min(80%, 650px)"}}>
          <video ref={videoRef} id="video" autoPlay playsInline style={{ width: '100%', height: 'auto', border: '1px solid #ccc' }}></video>
        </div>

        {/* If the active time out if off, show the form (if not camera feed), otherwise display a loading icon */}
        {!activeTimeout ? (
          !readingFromCamera && (
            <>
              {assetTagFocused === "ready" && 	
              <section className="center-box" style={{backgroundColor: "#d5f7d5ff", borderColor: "#8bb98bff", borderStyle: "solid"}}>
                <i className="fa-solid fa-barcode"></i>
                <p>Ready To Scan</p>
              </section>
              }
              { assetTagFocused === "idle" &&
              <section onClick={handleGetFocus} className="center-box" style={{backgroundColor: "#e2e2e2ff", borderColor: "#a0a0a0ff" }}>
                <i className="fa-solid fa-arrow-pointer"></i>
                <p>Click here to start scanning</p>
              </section>
              }
              {assetTagFocused === "wait" &&
              <section className="center-box" style={{backgroundColor: "#fff3cd", borderColor: "#ffc107", borderStyle:"solid"}}>
                <i className="fa-solid fa-spinner"></i>
                <p> Loading... Do not scan yet</p>
              </section>
              }
              <form onSubmit={(event) => handleSubmit(event)} style={{marginTop: "15px"}}>
                <input style={{opacity: 0}}autoFocus ref={assetTagRef} type="text" placeholder="Click Here to Scan" onFocus={() => setAssetTagFocused("ready")} onBlur={() => setAssetTagFocused("idle")}></input>
              </form>
            </>
          )
        ) : 
          <section className="center-box" style={{backgroundColor: "#ececd9ff", borderColor: "#f4ff95ff", borderStyle:"solid"}}>
            <i className="fa-solid fa-spinner"></i>
            <p>Loading... Don't scan yet!</p>
          </section>
        }
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
    }
    </div>
  )
}

export default Home
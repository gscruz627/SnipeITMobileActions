import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import './App.css'
import { BrowserMultiFormatReader} from '@zxing/browser';
import type { Result } from '@zxing/library';

// Enums for Scan Choice, Checkout Choices and Reading Type.
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
enum ReadingType{
  Camera = "camera",
  Keyboard = "keyboard",
  Scanner = "scanner"
}

// This type defines the different states of the request, this controls
// whether the user can keep scanning or has to wait to avoid multiple scans
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
  const trimWhitespace: string = localStorage.getItem('trim-whitespace') ?? '';
  const prefixes: Array<string> = localStorage.getItem('prefixes')?.split(" ") ?? [];
  const removedChars: Array<string> = localStorage.getItem('removed-chars')?.split(" ") ?? [];
  const casingSelection: string = localStorage.getItem('casing-selection') ?? '';

  // Controls the reading mode: scanner, keyboard, and camera
  const [readMode, setReadMode] = useState<ReadingType>(ReadingType.Scanner);

  // When checking out, this controls if we check out to user, location, or asset
  const [checkOutOption, setCheckOutOption] = useState<CheckOutChoice>(CheckOutChoice.User);
  
  // Controls the main reading choice: Move and Audit, Move, Archive, etc.
  // We will add a ref to work alongside the state because it is the only way I got the 
  // state to be synced when reading from camera, it may have to do with the fact that
  // the scanner started scanning when a state was something else, unsure.
  const [choice, setChoice] = useState<ScanChoice>(ScanChoice.MoveAndAudit);
  const choiceReference = useRef(choice);
  useEffect(() => {
    choiceReference.current = choice;
  }, [choice]);

  // This controls the state of scaanning, idle, waiting and ready
  const [assetTagFocused, setAssetTagFocused] = useState<assetTagState>("idle");

  // In general, regardless of using the camera scanning mode, there is a timeout
  // which lasts the 'delay' configured in the settings, before the user can scan/read
  // another device.
  const [activeTimeout, setActiveTimeout] = useState(false);

  // When using the 'keyboard' scanning option, because it accepts asset tags and device name
  // many results may occur, this lists all search results.
  const [multipleSearchResults, setMultipleSearchResults] = useState<Array<object>>([]);

  // Messages for failure, success, or found locations.
  const [resolvedLocation, setResolvedLocation] = useState("");
  const [resolvedCheckedOutLocation, setResolvedCheckedOutLocation] = useState("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [failureMessage, setFailureMessage] = useState<string>("");

  // References for the location field, checkout selection field, and the main asset tag input
  const locationRef = useRef<HTMLInputElement>(null);
  const checkoutRef = useRef<HTMLInputElement>(null);
  const assetTagRef = useRef<HTMLInputElement>(null);
  
  // Video and scanning states, references and objects
  const [cameras, setCameras] = useState<MediaDeviceInfo[] | never[]>([])
  const [cameraIndex, setCameraIndex] = useState(0);
  const [scanning, setScanning] = useState<boolean>(false);
  let currentScanner: any = null;
  let hasScanned: boolean = false;
  const codeReader = new BrowserMultiFormatReader();

  const navigate = useNavigate();

  async function handleSubmit(
  {
    event = null,
    assetTag = null,
  }: {
    event?: React.FormEvent<HTMLFormElement> | null;
    assetTag?: string | null;
  } = {}
  ){
    // this function handles the main submit event, apply settings if needed first

    if(event){ event.preventDefault(); }

    // This is for when after displaying multiple results, the user personally selects
    // a specific device passed to this function
    if(assetTag){ assetTagRef.current!.value = assetTag}
    
    if (assetTagRef.current?.value) {
      let tag = assetTagRef.current.value;

      // Leading zeroes
      if (leadingOne === "true") {
        tag = tag.replace(/^0+/, '');
      }

      // Trim whitespace
      if (trimWhitespace === "true") {
        tag = tag.trim();
      }

      // Remove prefix (match start)
      for (const prefix of prefixes) {
        if (tag.startsWith(prefix)) {
          tag = tag.slice(prefix.length);
          break; // Remove only the first matching prefix
        }
      }

      // Remove specific characters
      for (const ch of removedChars) {
        tag = tag.split(ch).join('');
      }

      // Casing normalization
      if (casingSelection === 'uppercase') {
        tag = tag.toUpperCase();
      } else if (casingSelection === 'lowercase') {
        tag = tag.toLowerCase();
      }

      // Final assignment
      assetTagRef.current.value = tag;
    }
    
    // Run different functions depending on the choice.
    switch (choiceReference.current) {
      case ScanChoice.MoveAndAudit: await moveAndAudit(); break;
      case ScanChoice.Move: await move(); break;
      case ScanChoice.CheckIn: await checkIn(); break;
      case ScanChoice.CheckOut: await checkOut(); break;
      case ScanChoice.Archive: await archive(); break;
      case ScanChoice.Location: await displayLocation(); break;
    }
  }

  async function handleKeyboardSubmit(event: React.FormEvent<HTMLFormElement>){
    // This function executes only after the user selects keyboard option and submits the form
    // the difference is that there may be many search results, after selecting a specfic
    // device, this will be passed to handleSubmit({assetTag})
    event.preventDefault();
    const query = encodeURIComponent(assetTagRef.current?.value || "");
    
    // For whatever reason, if we search using the asset tag, the device won't show up
    // so we first query if an asset goes by that assetTag on the user field.
    const assetResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${query}`, "GET");
    const directAssetExistance = await checkExistance(assetResponse, query, "asset");
    if(directAssetExistance){
      handleSubmit({});
      return;
    }

    // If there is no direct asset tag match proceed with a general asset search
    const response = await fetchData(`${snipeItApiUrl}/api/v1/hardware?search=${query}`);
    // nothing was found with what the user provided.
    if(response === null){ return;}
    if(response.total === 0){
      setFailureMessage("No results were found");
      resetState();
      return;
    }
    // only one asset was found and the request will be processed as usual
    if(response.total === 1){
      assetTagRef.current!.value = response.rows[0].asset_tag;
      await handleSubmit({});
      return;
    }
    // more than one asset was found, a list will be shown to the user to choose for a
    // specific asset. This is shown to the user on a <ul>, each <li> calls handleFunction
    // with a selected {assetTag}
    setMultipleSearchResults(response.rows);
  } 

  function resetState(): void{
    // This function runs after each request and cleans all the states, activates the timeout
    // for {delay} specified seconds.
    setActiveTimeout(true);
    setTimeout(() => {
        setActiveTimeout(false);
        setResolvedLocation("");
        setResolvedCheckedOutLocation("");
        setFailureMessage("");
        setSuccessMessage("");
        hasScanned = false;
        if (readMode === ReadingType.Camera){ setScanning(true)}
        if (assetTagRef.current) { assetTagRef.current.value = ""; }
    }, delay * 1000);
  };

  async function fetchData(url: string, method:string = "GET", body: string | null = null){
    // this function was made because there are many fetches accross the component
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
    const response = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${tag}`, "GET");
    const existance = await checkExistance(response,tag,"asset");
    if (!existance){ return; }
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
    const existance = await checkExistance(response,tag,"asset");
    if (!existance){ return; }
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
    const existance = await checkExistance(response,tag,"asset");
    if (!existance){ return; }
    // Proceed with the Location Find Request
    const assetId = response.id;
    const location: string = locationRef.current?.value ?? "";
    const locationResponse = await fetchData(`${snipeItApiUrl}/api/v1/locations?search=${location}`, "GET");
    const locationExistance = await checkExistance(locationResponse,location, "Location");
    if(!locationExistance){return}

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
    const existance = await checkExistance(response,tag,"asset");
    if (!existance){ return; }
    
    // Proceed with the Location Find Request
    const assetId = response.id;
    const location: string = locationRef.current?.value ?? "";
    const locationResponse = await fetchData(`${snipeItApiUrl}/api/v1/locations?search=${location}`, "GET");
    const locationExistance = await checkExistance(locationResponse,location, "Location");
    if(!locationExistance){return}
    
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
    const existance = await checkExistance(response,tag,"asset");
    if (!existance){ return; }
    // Proceed with the Location Find Request
    const assetId = response.id;
    const location: string = locationRef.current?.value ?? "";
    const locationResponse = await fetchData(`${snipeItApiUrl}/api/v1/locations?search=${location}`, "GET");
    const locationExistance = await checkExistance(locationResponse,location, "Location");
    if(!locationExistance){return}
    
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
      const existance = await checkExistance(response,tag,"asset");
      if (!existance){ return; }
      
      // Choose to user or to location and check either of their existence.
      const assetId = response.id;
      let locationResponse = null, userResponse = null, assetResponse = null;
      if(checkOutOption === CheckOutChoice.Location){
          const location = checkoutRef.current?.value;
          locationResponse = await fetchData(`${snipeItApiUrl}/api/v1/locations?search=${location}`, "GET");
          const locationExistance = await checkExistance(locationResponse,location, "Location");
          if(!locationExistance){return}
      } 
      else if(checkOutOption === CheckOutChoice.Asset){
        const sourceAssetTag = checkoutRef.current?.value;
        assetResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/bytag/${sourceAssetTag}`, "GET")
        const assetExistance = await checkExistance(response, sourceAssetTag, "asset");
        if(!assetExistance){return;}
      }      
      else {
          const user = checkoutRef.current?.value;
          userResponse = await fetchData(`${snipeItApiUrl}/api/v1/users?search=${user}`, "GET");
          const userExistance = await checkExistance(userResponse, user, "User");
          if(!userExistance){return;}
      }

    // Proceed with checkout request
    const checkoutResponse = await fetchData(`${snipeItApiUrl}/api/v1/hardware/${assetId}/checkout`, "POST", JSON.stringify({
        "status_id": checkOutId,
        "checkout_to_type": checkOutOption.toLowerCase(),
        "assigned_user": (checkOutOption === CheckOutChoice.User) ? userResponse.rows[0].id : null,
        "assigned_location" : (checkOutOption === CheckOutChoice.Location) ? locationResponse.rows[0].id : null,
        "assigned_asset" : (checkOutOption === CheckOutChoice.Asset) ? assetResponse.id : null
    }));
    if(!checkoutResponse){return}
    if(checkoutResponse.status === "error"){
      setFailureMessage("Asset is not available for checkout! Check In First!");
      resetState(); 
      return;
    }
    let targetName = "Unknown";

    if (checkOutOption === CheckOutChoice.User) {
      targetName = userResponse.rows[0].name;
    } else if (checkOutOption === CheckOutChoice.Location) {
      targetName = locationResponse.rows[0].name;
    } else if (checkOutOption === CheckOutChoice.Asset) {
      targetName = assetResponse.name;
    }

    setSuccessMessage(`Checked Out Asset with name: ${response.name ? response.name : response.serial} to: ${targetName}.`);
    resetState();
    return;
  }

  function handleGetFocus(){
    assetTagRef.current?.focus();
  }

async function startBarcodeScanner(deviceId: string) {
  // this function clears previous scanner objects, and starts decoding 
  // barcodes from a specific device (camera) using its {deviceId}
  if(!scanning){ return; }
  if(currentScanner){
    currentScanner.stop();
    currentScanner = null;
  }

  hasScanned = false;
  codeReader.decodeFromVideoDevice(
    deviceId,
    'video', // This is the HTML #id of the <video>
    async (
      result: Result | undefined,
      controls: any
    ) => {
      if(!currentScanner){
        // If there not a scanner object yet, make it this one
        currentScanner = controls;
      }
      if (result && !hasScanned) {
        // Set up hasScanned to true (a workaround to force the scanner to stop
        // even if the camera is 24/7 pointed at some barcode, this caused issues)
        hasScanned = true;
        setScanning(false);
        // actually stop scanning while maintaining the same scanner
        controls.stop();
        currentScanner = null;
        assetTagRef.current!.value = result.getText();
        handleSubmit({})
        resetState();
      }
    }
  );
}

function getCameras() {
  // This function does many things regarding the camera, find the <video> object first
  if (readMode !== ReadingType.Camera) return;
  const video = document.querySelector("video")!;

  // We will need this tempStream because, on some devices, enumerateDevices() will
  // return empty unless some stream is already playing
  let tempStream: MediaStream;
  return navigator.mediaDevices.getUserMedia({video: true})
    .then((stream) => {
      tempStream = stream;
      // start playing video feed from this temporary stream, so as to enable enumerateDevices()
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
      // Once we have all the videoInputs and we can switch through them, stop this temporary stream
      tempStream.getTracks().forEach( (track) => track.stop());

      // setCameraIndex has a useEffect that will actually start the video feed from this default
      // deviceId (the device on index 0 of {videoInputs})
      setCameras(videoInputs);
      setCameraIndex(0);
      return videoInputs;
    });
}

function stopCameraCurrent(){
  // This function tries to stop the current camera stream, this only works
  // if the <video> is still displaying, that is why, regardless of scanning choice
  // (keyboard,camera, or scanner), the <video> is still there, just with no opacity.
  const video = document.querySelector("video");
  if(video?.srcObject){
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach( (track) => track.stop());
    video.srcObject = null;
  }
}

function switchCameras(){
  // We set the camera index to the next available, this will trigger a UseEffect
  // which will cause the barcode scanner to read using another camera
  setCameraIndex((prev) => (prev + 1) % cameras.length);
}


useEffect(() => {
  // This hooks stops the current camera stream and starts the barcode scanner
  // when either: cameras changes (first time cameras are loaded in, trust me, for whatever
  // reason, that cameraIndex is set to zero on getCameras() is not enough, it must explicitly
  // run).
  // or when cameraIndex changes (new camera stream to load) or scanning changes from false to true
  // or viceversa.
  if(cameras.length !== 0 && cameraIndex != null){
    stopCameraCurrent();
    startBarcodeScanner(cameras[cameraIndex].deviceId);
  }
}, [cameras, cameraIndex, scanning])


useEffect(() => {
  // This hook determines whether the camera stream should start or stop
  // if read mode is camera, set scanning to true and load cameras, read getCameras() for more
  // otherwise stop the current camera stream.
  if (readMode === ReadingType.Camera) {
    setScanning(true);
    getCameras();
  } else {
    stopCameraCurrent();
  }

}, [readMode]);

useEffect(() => {
// this hook may look overkill but it's the only way it worked for me
// this is the cleanup function for when the component is about to unload
// I've tried useRef and regular <video> and both won't stop their video stream
// if the user leaves this view (component unloads), by the time user leaves
// <video> and videoRef.current (if using ref) are null, so they won't stop their stream
// thus we stopCameraCurrent -- this is useless, we force a page reload
// and we keep track of whether we already did because otherwise we end on a loop.
  return () => {
    stopCameraCurrent();
    const alreadyReloaded = sessionStorage.getItem('alreadyReloaded');
    if (!alreadyReloaded) {
      sessionStorage.setItem('alreadyReloaded', 'true');
      window.location.reload();
    } else {
      sessionStorage.removeItem('alreadyReloaded'); // Reset for future use
    }
    };
}, []);

  return (
    <div>
      <header>

        <Link to="/"><h2><strong style={{color: "#333"}}>Snipe IT</strong> Actions</h2></Link>

        <div id="header-icon-group">
            <div onClick={() => setReadMode(ReadingType.Scanner)} className="choice-icon">
              <i className="fa-solid fa-barcode"></i>
            </div>
            <div onClick={() => setReadMode(ReadingType.Camera)} className='choice-icon'>
              <i className="fa-solid fa-camera"></i>
            </div>
            <div onClick={() => setReadMode(ReadingType.Keyboard)} className='choice-icon'>
              <i className="fa-solid fa-keyboard"></i>
            </div>
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
      </section>
      :
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
              <button className={checkOutOption === CheckOutChoice.User ? "selected" : undefined} onClick={() => setCheckOutOption(CheckOutChoice.User)}>
                <i className="fa-solid fa-user"></i> User
              </button>
              <button className={checkOutOption === CheckOutChoice.Location ? "selected" : undefined} onClick={() => setCheckOutOption(CheckOutChoice.Location)}>
                <i className="fa-solid fa-location-dot"></i> Location
              </button>
              <button className={checkOutOption === CheckOutChoice.Asset ? "selected" : undefined} onClick={() => setCheckOutOption(CheckOutChoice.Asset)}>
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
        <div style={{ opacity: readMode === ReadingType.Camera && !activeTimeout ? 1 : 0, pointerEvents: readMode === ReadingType.Camera && !activeTimeout ? "auto" : "none", transition: "opacity 0.3s ease", width: "min(80%, 650px)", position: "relative" }}>
          <button id="switch-camera-button" onClick={switchCameras} style={{ position: "absolute", zIndex: 10 }}>
            <i className="fa-solid fa-camera-rotate"></i>
          </button>
          <video id="video" autoPlay playsInline style={{ width: readMode === ReadingType.Camera ? '100%' : '0', height: readMode === ReadingType.Camera ? 'auto' : '0', border: '1px solid #ccc' }}></video>
      </div>

        {activeTimeout && 
          <section className="center-box" style={{backgroundColor: "#ececd9ff", borderColor: "#f4ff95ff", borderStyle:"solid"}}>
            <i className="fa-solid fa-spinner"></i>
            <p>Loading... Don't scan yet!</p>
          </section>
        }

        {/* If the active time out if off, show the form (if not camera feed), otherwise display a loading icon */}
        {(!activeTimeout && (readMode === ReadingType.Scanner)) && 
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
            </>
        }
        {(!activeTimeout && readMode !== ReadingType.Camera) && (
          <>
            {assetTagFocused === "wait" && (
              <section
                className="center-box"
                style={{
                  backgroundColor: "#fff3cd",
                  borderColor: "#ffc107",
                  borderStyle: "solid"
                }}
              >
                <i className="fa-solid fa-spinner"></i>
                <p>Loading... Do not scan yet</p>
              </section>
            )}
          </>
        )}
            <form
              onSubmit={(event) => readMode === ReadingType.Scanner ? handleSubmit({event:event}) : handleKeyboardSubmit(event)}
              style={{ marginTop: "15px" }}
            >
              <input
                style={{ opacity: (readMode === ReadingType.Keyboard && !activeTimeout) ? 1 : 0 }}
                autoFocus
                ref={assetTagRef}
                type="text"
                placeholder="Asset Tag (#) or Name"
                onFocus={() => setAssetTagFocused("ready")}
                onBlur={() => setAssetTagFocused("idle")}
              />
            </form>

        {(!activeTimeout && readMode === ReadingType.Keyboard && multipleSearchResults.length > 0) && (
          <div>
            <p>More than one device found, please select: </p><br/>
            <ul id="device-selection-list">
              {multipleSearchResults.map( (device: any /*JSON Object*/) => (
                <li onClick={() => {setMultipleSearchResults([]); handleSubmit({assetTag:device.asset_tag})}}>
                  <i className="fa-solid fa-computer"></i>{device.name} (#{device.asset_tag})
                </li>
              ))}
            </ul>
          </div>
        )}

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
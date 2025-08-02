import { useState, useEffect, useRef } from 'react'
import "./App.css"
import { Link } from 'react-router-dom'

const Settings = () => {
    const [successMessage, setSuccessMessage] = useState("");

    // Get the stored setting values from localStorage
    const snipeItApiKey: string = localStorage.getItem('snipe-it-key') ?? '';
    const snipeItApiUrl: string = localStorage.getItem('snipe-it-api-url') ?? '';
    const leadingOne: string = localStorage.getItem('leading-one') ?? '';
    const archivedId: string = localStorage.getItem('archived-id') ?? '';
    const checkOutId: string = localStorage.getItem('check-out-id') ?? '';
    const delay: string = localStorage.getItem('delay') ?? '';
    const auditWaitTime: string = localStorage.getItem('audit-wait-time') ?? '';

    // Declare the references to the input fields
    const apiKeyRef = useRef<HTMLTextAreaElement>(null);
    const apiUrlRef = useRef<HTMLInputElement>(null);
    const leadingOneRef = useRef<HTMLInputElement>(null);
    const archivedIdRef = useRef<HTMLInputElement>(null);
    const checkoutIdRef = useRef<HTMLInputElement>(null);
    const delayRef = useRef<HTMLInputElement>(null);
    const auditWaitTimeRef = useRef<HTMLInputElement>(null);


    function handleSubmit(event: React.FormEvent<HTMLFormElement>){
        event.preventDefault();

        // Avoid null values
        const apiKey = apiKeyRef.current?.value ?? '';
        const apiUrl = apiUrlRef.current?.value ?? '';
        const leading = leadingOneRef.current?.value ?? '';
        const archived = archivedIdRef.current?.value ?? '';
        const checkout = checkoutIdRef.current?.value ?? '';
        const delayVal = delayRef.current?.value ?? '';
        const auditWait = auditWaitTimeRef.current?.value ?? '';

        // Save to localStorage or process as needed
        localStorage.setItem('snipe-it-key', apiKey);
        localStorage.setItem('snipe-it-api-url', apiUrl);
        localStorage.setItem('leading-one', leading);
        localStorage.setItem('archived-id', archived);
        localStorage.setItem('check-out-id', checkout);
        localStorage.setItem('delay', delayVal);
        localStorage.setItem('audit-wait-time', auditWait);
        setSuccessMessage("Settings saved successfully.");
        setTimeout(() => { setSuccessMessage(""); }, 3000);
    }
    return (
        <div>
            <header>
                <Link to="/"><h2><strong style={{color: "#333"}}>Snipe IT</strong> Actions</h2></Link>
            </header>

            { (successMessage !== "") && 
                <div className="success-box" style={{width: "min(650px, 100%)", margin: "auto auto", marginTop: "30px"}}> <strong>&#10003; Success: </strong>{successMessage}</div>
            }

            <div className='box'>
                <h3 style={{width: "100%", borderBottom: "1px solid #F4F4F4", padding: "0 0 10px 60px"}}>Settings</h3><br/>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="url">Snipe IT URL:</label><br/>
                    <input
                    ref={apiUrlRef}
                    defaultValue={snipeItApiUrl}
                    type="text"
                    id="url"
                    /><br/>

                    <label htmlFor="apiKey">Snipe IT API Key: </label><br/>
                    <textarea
                    ref={apiKeyRef}
                    defaultValue={snipeItApiKey}
                    id="apiKey"
                    cols={60}
                    rows={10}
                    /><br/>

                    <label htmlFor="archivedId">Archived ID:</label><br/>
                    <input
                    ref={archivedIdRef}
                    defaultValue={archivedId}
                    type="number"
                    id="archivedId"
                    /><br/>

                    <label htmlFor="checkoutId">Check Out ID:</label><br/>
                    <input
                    ref={checkoutIdRef}
                    defaultValue={checkOutId}
                    type="number"
                    id="checkoutId"
                    /><br/>

                    <label htmlFor="delay">Delay (s):</label><br/>
                    <input
                    ref={delayRef}
                    defaultValue={delay}
                    type="number"
                    id="delay"
                    /><br/>

                    <label htmlFor="nextAudit">Next Audit Date (Yrs): </label><br/>
                    <input
                    ref={auditWaitTimeRef}
                    defaultValue={auditWaitTime}
                    type="number"
                    id="nextAudit"
                    /><br/>

                    <label htmlFor="leadingOne">Skip Leading One:</label><br/>
                    <input
                    ref={leadingOneRef}
                    defaultChecked={leadingOne === 'true'}
                    type="checkbox"
                    id="leadingOne"
                    />

                    <button type="submit" className='blue-button'>&#10003; Save</button>
                </form>
            </div>
        </div>
    )
}

export default Settings
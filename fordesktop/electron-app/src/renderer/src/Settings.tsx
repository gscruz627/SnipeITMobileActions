import { useState, useEffect, useRef } from 'react'
import "./App.css"
import { Link } from 'react-router-dom'

const Settings = () => {
    const [successMessage, setSuccessMessage] = useState<string>("");

    // Get the stored setting values from localStorage
    const snipeItApiKey: string = localStorage.getItem('snipe-it-key') ?? '';
    const snipeItApiUrl: string = localStorage.getItem('snipe-it-api-url') ?? '';
    const leadingOne: string = localStorage.getItem('leading-one') ?? '';
    const archivedId: string = localStorage.getItem('archived-id') ?? '';
    const checkOutId: string = localStorage.getItem('check-out-id') ?? '';
    const delay: string = localStorage.getItem('delay') ?? '';
    const auditWaitTime: string = localStorage.getItem('audit-wait-time') ?? '';
    const trimWhitespace: string = localStorage.getItem('trim-whitespace') ?? '';
    const prefixes: Array<string> = localStorage.getItem('prefixes')?.split(" ") ?? [];
    const removedChars: Array<string> = localStorage.getItem('removed-chars')?.split(" ") ?? [];
    const casingSelection: string = localStorage.getItem('casing-selection') ?? '';

    // Declare the references to the input/textarea fields
    const apiKeyRef = useRef<HTMLTextAreaElement>(null);
    const apiUrlRef = useRef<HTMLInputElement>(null);
    const leadingOneRef = useRef<HTMLInputElement>(null);
    const archivedIdRef = useRef<HTMLInputElement>(null);
    const checkoutIdRef = useRef<HTMLInputElement>(null);
    const delayRef = useRef<HTMLInputElement>(null);
    const auditWaitTimeRef = useRef<HTMLInputElement>(null);
    const trimWhitespaceRef = useRef<HTMLInputElement>(null);
    const prefixesRef = useRef<HTMLTextAreaElement>(null);
    const removedCharsRef = useRef<HTMLTextAreaElement>(null);
    const [changeCasingSelection, setCasingSelection] = useState<string>(casingSelection);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>){
        event.preventDefault();

        // Avoid null values
        const apiKey = apiKeyRef.current?.value ?? '';
        const apiUrl = apiUrlRef.current?.value ?? '';
        const leading = leadingOneRef.current?.checked ?? false;
        const archived = archivedIdRef.current?.value ?? '';
        const checkout = checkoutIdRef.current?.value ?? '';
        const delayVal = delayRef.current?.value ?? '';
        const auditWait = auditWaitTimeRef.current?.value ?? '';
        const trimWhitespace = trimWhitespaceRef.current?.checked ?? false;
        const prefixes = prefixesRef.current?.value ?? '';
        const prefixesArray = prefixes.split("\n").map(s => s.trim()).filter(Boolean);
        const removedChars = removedCharsRef.current?.value ?? '';
        const removedCharsArray = removedChars.split("\n").map(s => s.trim()).filter(Boolean);
        const casingSelection: string = changeCasingSelection;

        // Save to localStorage or process as needed
        localStorage.setItem('snipe-it-key', apiKey);
        localStorage.setItem('snipe-it-api-url', apiUrl);
        localStorage.setItem('leading-one', String(leading));
        localStorage.setItem('archived-id', archived);
        localStorage.setItem('check-out-id', checkout);
        localStorage.setItem('delay', delayVal);
        localStorage.setItem('audit-wait-time', auditWait);
        localStorage.setItem('trim-whitespace', String(trimWhitespace));
        localStorage.setItem('prefixes', prefixesArray.join(" "));
        localStorage.setItem('removed-chars', removedCharsArray.join(" "));
        localStorage.setItem('casing-selection', casingSelection);
        setSuccessMessage("Settings saved successfully.");
        setTimeout(() => { setSuccessMessage(""); }, 3000);
    }
    return (
        <div>
            <header>
                <Link to="/"><h2><strong style={{color: "#333"}}>Snipe IT</strong> Actions</h2></Link>
            </header>

            { (successMessage !== "") && 
                <div className="success-box" style={{width: "min(650px, 100%)", margin: "auto auto", marginTop: "30px", position: "fixed"}}> <strong>&#10003; Success: </strong>{successMessage}</div>
            }

            <div className='box'>
                <h3 style={{width: "100%", borderBottom: "1px solid #F4F4F4", padding: "0 0 10px 38px"}}>Settings</h3><br/>
                <p>Fields with * are required.</p><br/><br/>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="url">Snipe IT URL *:</label><br/>
                    <input
                    ref={apiUrlRef}
                    defaultValue={snipeItApiUrl}
                    type="text"
                    id="url"
                    required
                    /><br/>

                    <label htmlFor="apiKey">Snipe IT API Key *: </label><br/>
                    <textarea
                    ref={apiKeyRef}
                    defaultValue={snipeItApiKey}
                    id="apiKey"
                    required
                    cols={60}
                    rows={10}
                    /><br/>

                    <label htmlFor="archivedId">Archived ID *:</label><br/>
                    <input
                    ref={archivedIdRef}
                    defaultValue={archivedId}
                    type="number"
                    id="archivedId"
                    required
                    /><br/>

                    <label htmlFor="checkoutId">Check Out ID *:</label><br/>
                    <input
                    ref={checkoutIdRef}
                    defaultValue={checkOutId}
                    type="number"
                    id="checkoutId"
                    required
                    /><br/>

                    <label htmlFor="delay">Delay (s) *:</label><br/>
                    <input
                    ref={delayRef}
                    defaultValue={delay}
                    type="number"
                    id="delay"
                    required
                    /><br/>

                    <label htmlFor="nextAudit">Next Audit Date (Yrs) *: </label><br/>
                    <input
                    ref={auditWaitTimeRef}
                    defaultValue={auditWaitTime}
                    type="number"
                    id="nextAudit"
                    required
                    /><br/>

                    <label htmlFor="leadingOne">Skip Leading Zeroes:</label><br/>
                    <input
                    ref={leadingOneRef}
                    defaultChecked={leadingOne === 'true'}
                    type="checkbox"
                    id="leadingOne"
                    />

                    <label htmlFor="trimWhitespace">Trim Whitespace on Asset Tag: </label><br/>
                    <input
                    ref={trimWhitespaceRef}
                    defaultChecked={trimWhitespace === 'true'}
                    type="checkbox"
                    id="trimWhitespace"
                    />

                    <label>My database exclusively uses: (Leave empty if N/A)</label>
                    <div>
                        <label>
                            <input
                            type="radio"
                            value="uppercase"
                            checked={changeCasingSelection === 'uppercase'}
                            onChange={(e) => setCasingSelection(e.target.value)}
                            />
                            &nbsp;&nbsp;Uppercase
                        </label><br/>

                        <label>
                            <input
                            type="radio"
                            value="lowercase"
                            checked={changeCasingSelection === 'lowercase'}
                            onChange={(e) => setCasingSelection(e.target.value)}
                            />
                            &nbsp;&nbsp;Lowercase
                        </label><br/>

                        <label>
                            <input
                            type="radio"
                            value=""
                            checked={changeCasingSelection === ''}
                            onChange={(e) => setCasingSelection(e.target.value)}
                            />
                            &nbsp;&nbsp;N/A
                        </label>
                    </div>

                    <label htmlFor="prefixes">My system uses prefixes<br/>
                    <small>For example PC-ABC123, COMP1093 and need to be removed from the scanned
                        barcode before checking against the database. List all prefixes used on each separate line.
                    </small>
                    </label>
                    <textarea
                    ref={prefixesRef}
                    id="prefixes"
                    defaultValue={prefixes.join("\n")}
                    />

                    <label htmlFor="removedChars">My system uses extra characters that must be ignored<br/>
                    <small>For example the scanner reads 123-AB-10 but 123AB10 is stored in the database. List each ignored character on
                        each separate line.
                    </small>
                    </label>
                    <textarea
                    ref={removedCharsRef}
                    id="removedChars"
                    defaultValue={removedChars.join("\n")}
                    />
                    <button type="submit" className='blue-button'>&#10003; Save</button>
                </form>
            </div>
        </div>
    )
}

export default Settings
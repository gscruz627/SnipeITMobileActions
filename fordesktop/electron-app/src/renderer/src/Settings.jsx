import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setConfiguration } from './commonSlice'
import "./App.css"
import { Link } from 'react-router-dom'

const Settings = () => {
    const [successMessage, setSuccessMessage] = useState("");
    const [failureMessage, setFailureMessage] = useState("");

    const SNIPE_IT_API_KEY = useSelector((state) => state.snipeItKey);
    const SNIPE_IT_API_URL = useSelector((state) => state.snipeItUrl);
    const LEADING_ONE = useSelector((state) => state.leadingOne);
    const ARCHIVED_ID = useSelector((state) => state.archivedId);
    const CHECKED_OUT_ID = useSelector((state) => state.checkoutId);
    const DELAY = useSelector((state) => state.delay);

    const [changeApiKey, setChangeApikey] = useState(SNIPE_IT_API_KEY);
    const [changeApiUrl, setChangeApiUrl] = useState(SNIPE_IT_API_URL);
    const [changeLeadingOne, setChangeLeadingOne] = useState(LEADING_ONE);
    const [changeArchivedId, setChangeArchivedId] = useState(ARCHIVED_ID);
    const [changeCheckoutId, setChangeCheckoutId] = useState(CHECKED_OUT_ID);
    const [changeDelay, setChangeDelay] = useState(DELAY)

    const dispatch = useDispatch();

    const saveSettings = (e) => {
        e.preventDefault();
        if(changeApiKey !== "" && changeApiUrl !== "" && changeLeadingOne !== null && changeArchivedId !== "" && changeCheckoutId !== "" && changeDelay !== 0){
            dispatch(setConfiguration({
                snipeItKey: changeApiKey,
                snipeItUrl: changeApiUrl,
                leadingOne: changeLeadingOne,
                archivedId: changeArchivedId,
                checkoutId: changeCheckoutId,
                delay: changeDelay
            }))
            setSuccessMessage("Settings saved successfully.");
            setTimeout(() => {
                setSuccessMessage("");
            }, 3000)
        } else {
            setFailureMessage("Fields cannot be empty.")
            setTimeout( () => {
                setFailureMessage("");
            }, 3000)
        }
    }
    useEffect(() => {
        setChangeApikey(SNIPE_IT_API_KEY);
        setChangeApiUrl(SNIPE_IT_API_URL);
        setChangeLeadingOne(LEADING_ONE);
        setChangeArchivedId(ARCHIVED_ID);
        setChangeCheckoutId(CHECKED_OUT_ID);
        setChangeDelay(DELAY);
    }, [SNIPE_IT_API_KEY, SNIPE_IT_API_URL, LEADING_ONE, ARCHIVED_ID, CHECKED_OUT_ID, DELAY]);
    return (
        <div>
            <header>
                <Link to="/"><h2><strong style={{color: "#333"}}>Snipe IT</strong> Mobile Actions</h2></Link>
            </header>

            { (successMessage !== "") && 
                <div className="success-box" style={{width: "min(650px, 100%)", margin: "auto auto", marginTop: "30px"}}> <strong>&#10003; Success: </strong>{successMessage}</div>
            }

            { (failureMessage !== "") &&
                <div className="error-box" style={{width: "min(650px, 100%)", margin: "auto auto", marginTop: "30px"}}> <strong>&#9888; Error: </strong>{failureMessage}</div>
            }
            <div className='box'>
                <h3 style={{width: "100%", borderBottom: "1px solid #F4F4F4", padding: "0 0 10px 60px"}}>Settings</h3><br/>
                <form onSubmit={(e) => saveSettings(e)}>
                    
                    <label htmlFor="url">Snipe IT URL:</label><br/>
                    <input onChange={(e) => setChangeApiUrl(e.target.value)} value={changeApiUrl} defaultValue={SNIPE_IT_API_URL} type="text" id="url"></input><br/>


                    <label htmlFor="apiKey">Snipet IT API Key: </label><br/>
                    <textarea onChange={(e) => setChangeApikey(e.target.value)} value={changeApiKey} id="apiKey" cols="60" rows="10"></textarea><br/>

                    <label htmlFor="archivedId">Archived ID:</label><br/>
                    <input onChange={(e) => setChangeArchivedId(e.target.value)} value={changeArchivedId} type="number" id="archivedId"></input><br/>
       
                    <label htmlFor="checkoutId">Deployed ID:</label><br/>
                    <input onChange={(e) => setChangeCheckoutId(e.target.value)} value={changeCheckoutId} type="number" id="checkoutId"></input><br/>

                    <label htmlFor="delay">Delay (s):</label><br/>
                    <input onChange={(e) => setChangeDelay(e.target.value)} value={changeDelay} type="number" id="delay"></input><br/>
                    
                    <label htmlFor="leadingOne">Skip Leading One:</label><br/>
                    <input onChange={(e) => setChangeLeadingOne(!changeLeadingOne)}type="checkbox" checked={changeLeadingOne}></input>

                    <button type="submit" className='blue-button'>&#10003; Save</button>
                </form>
            </div>
        </div>
    )
}

export default Settings
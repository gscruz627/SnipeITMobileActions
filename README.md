<img width="300" height="300" alt="scanner-icon" src="https://github.com/user-attachments/assets/932bc57e-e33e-4018-990f-cb1b4588fd53" />

## Snipe IT Mobile Actions
This project uses React + Typescript to create a web applicatoin which interacts with the Snipe-IT Asset Management Systems via its REST API.
It targets two devices:
- Desktop: Using Electron, React and Vite
- Android: Using Capacitor, React and Vite
It provides a user interface for performing certain operations like check-in, check-out, archive, move, move and audit and display location (for accurate record keeping).
Input is handled through either the keyboard, a physical scanner (keyboard-like) or the device camera.

## Stack
- Languages: Typescript and Javascript
- Framework: React with Vite.
- State Management: For component states I used useState, useRef, and useEffect. I previously used Redux but removed for simplicitly, replaced with LocalStorage.
- Setttings are stored in LocalStorage.
- API Communication is handlled using Fetch API in Electron and CapacitorHTTP in Capacitor.
- Scanning: I used ZXing for Javascript to read from the camera, I used Capacitor's Camera module to acccess the camera on mobile devices.

## Application Flow and Instructions
1. Start:
   - Configure your Snipe IT instance settings: url, api key, archive and check out id (obtain these calling GET {snipeiturl}/api/v1/statuslabels.
2. Select barcode input:
   - Camera option: Point the camera to the barcode, change cameras using the change camera button on top of the camera feed.
   - Physical Scanner: This relies on a physical scanner reading capabilities typing the barcode content and then typing the 'Enter' key which submits the <form>.
   - Keyboard: Search devices direcly using Asset Tag or Device Names, if many devices are found, all search results will be deisplayed.
3. Request Handling:
   - Once the barcode has been read or device name / asset tag has been passed on the main read field a request is made to the Snipe-IT server.
   - If on 'Display Location', this will show either/both the default location and the checked out (assigned) location.
   - A success or failure message is shown to the user for the duration of a specified delay time (configured in the settings page.)
4. Operation Types:
   - There are many operations types: Move just moves the device, Move and Audit moves the device and audits to a date configured in the settings.
   - Check In checks in the devices to a specified location, archive archives (sets the status label to archived/depcreated/not in use, you select the ID on the settings)
   - Check Out checks the device out (assigns) to a location, user, or asset as specified by the user.
   - Display Location displays default and assigned location of the device or lets the user know the device has no location.

## Development and Build, Host instructions
1. Electron / Desktop
   - Navigate to /fordesktop/electron-app
   - run `npm install` to get all libraries
   - React app is located on /fordesktop/electron-app/src/renderer
   - run `npm run dev` which calls for electron-vite.
   - To build use `npm run build:win` or `npm run build:linux` or `npm run build:mac` depending on the device.
2. Android / Capacitor
   - Navigate to /forandroid
   - run `npm install` to get all libraries including capacitor
   - React app is located on /forandroid/client/src
   - Run `npm run dev` here to run the react app only
   - To build use `npm run build`, which will output files to /forandroid/www, which are the files that capacitor reads.
   - Then run `npx cap sync` on /forandroid/ and open Android Studio to edit and produce an .apk file.
     
## Images

- Main menu after configuring settings correctly
<img width="909" height="792" alt="Screenshot 2025-08-05 181638" src="https://github.com/user-attachments/assets/0eb702d2-d4c7-4e8d-9c30-85b74f0ab98c" />

- The electron app correctly displaying a device's location after scanning
<img width="911" height="923" alt="Screenshot 2025-08-05 185903" src="https://github.com/user-attachments/assets/a5dc45a8-26e5-4bb7-b33c-19c03fe1653a" />

- Android version displaying a succesfully checked out to person message.
![Android version checking out a device after reading](https://github.com/user-attachments/assets/83b7e009-e898-48ff-b65c-bbfd6f5f4b16)

## Future improvements
1. A `Display Information` in general, not just displaying location
2. A log for audits, and maybe a `Due Audit` section which shows devices that need auditing soon.
3. Improve Camera UX, it is somewhat forced to work right now.


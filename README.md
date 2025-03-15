## Snipe IT Mobile Actions
This project is both a desktop application and a mobile application for Android for performing some operations regarding Snipe IT asset managing with a physical scanner 
or with the device's camera.

## Instructions
Upon downloading, head to the settings (gear icon) and configure your instance of Snipe IT (URL, API Key, Delay, etc).
In the home page you will have many options (Move, Move and Audit, Check Out, Check In, Display Location and Archive).
You can toggle the text/camera version using the icon next to the settings
If you choose the camera, just point your camera to the barcode to the Asset Tag of the device and it will be processed.
If you choose the text version, you can use a physical scanner (keyboard-like) and focus on the input (Click here to start scanning), this will be auto-focussed so you
don't need to click again every time.
Either way, there will be a delay (of your choice) before a new device can be scanned (to avoid multiple requests)

## Images
- A Location was found for this device.
![Successful location found](/images/img1.png)

- A device was checked out to a location
![Sucessful Check Out](/images/img3.png)

- Camera is about to scan a device
![Camera working on Android](/images/img4.jpg)

- A location was found for this device using the android version
![Android Location found](/images/img5.jpg)

## How is it built
- ReactJS (Vite) + Redux Toolkit for the web application
- Electron for the desktop version
- Capacitor for the android version
- The icon was made with an AI software using an Open Source License requiring no attribution.

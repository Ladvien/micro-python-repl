import * as vscode from 'vscode';
import { MicroPythonREPL } from './microPythonREPL';
import { delay, showQuickPick, getUserText, typeError } from './util';
import { ISSID } from './interfaces/SSID';
import { write, writeFile } from 'fs';
import { start } from 'repl';
import { deleteFileOnDev, writeFileOnDev } from './microPythonFS';
import { Constants } from './terminalConstants';

export async function setupWifi(microREPL: MicroPythonREPL, override: any = undefined) {

        if(microREPL !== undefined) {
				
            microREPL.captureOutput = true;
            microREPL.showUser = false;

            let connectionStatus = `${microREPL.constants.RED}not connected${microREPL.constants.PURPLE}`;
            let selectedSSID = '';
            let password = '';
            try {
                await notifyUser(microREPL, 'Searching for WiFi...');
                await stopWifi(microREPL);
                if(!override){
                    const ssids = await getWifiSSIDInRange(microREPL);
                    selectedSSID = await showQuickPick(ssids.map(x => <string>x.ssid), 'No WiFi devices found.');
                    if(selectedSSID === '' || selectedSSID === undefined || selectedSSID === 'None'){
                        throw new Error('No WiFi selected.');
                    }
                    password = await getUserText('Enter WiFi password', true);
                    if(password === '' || password === undefined){
                        throw new Error('No password entered.');
                    }
                } else {
                    selectedSSID = override['ssid'];
                    password = override['password'];
                }
                await notifyUser(microREPL, 'Writing boot.py.');
                await writeBoot(microREPL, <string>selectedSSID, <string>password);
                microREPL.captureOutput = true;
                await notifyUser(microREPL, 'Resetting.');
                await microREPL.reset();
                await delay(3500);
                const capture = microREPL.getCaptureBuffer();
                if(capture.includes(`network: CONNECTED`)) { connectionStatus = `${microREPL.constants.GREEN}connected${microREPL.constants.PURPLE}`;}
                microREPL.showUser = true;
                microREPL.sendSystemMessage(`${microREPL.constants.NEWLINE}MicroPython boot.py file created.`);
                microREPL.sendSystemMessage(`Device will attempt to connect to ${selectedSSID} on startup.`);
                microREPL.sendSystemMessage(`Device is currently ${connectionStatus}.`);
                microREPL.getREPLPrompt();
                vscode.window.setStatusBarMessage(`MicroPython boot.py file created.`);
            } catch (error) {
                const e = typeError(error);
                microREPL.showUser = true;
                microREPL.getREPLPrompt();
                vscode.window.setStatusBarMessage('Setup WiFi: failed');
                vscode.window.showErrorMessage(`Setup WiFi: ${e.message}`);
            }
        }
}

export async function getWifiSSIDInRange(microREPL: MicroPythonREPL, searchRetries: number = 3) {

        let ssids: Array<ISSID> = []; 

        const wifiOnBoot =  `import network\n` +
                            `sta_if = network.WLAN(network.STA_IF)\n` +
                            `sta_if.active(True)\n` + 
                            `sta_if.scan()\n`;
    
        microREPL.captureOutput = true;
        for (let i = 0; i < searchRetries; i++) {
            try {
                await microREPL.sendSelectedText(wifiOnBoot);
                await delay(5000);
                ssids = parseWifiScanResults(microREPL.getCaptureBuffer());
                if(ssids.length > 0){ break; }
            } catch (error) {
                const e = typeError(error);
                microREPL.captureOutput = false;
                throw e;   
            }
        }
        microREPL.captureOutput = false;
        return ssids;
}

function parseWifiScanResults(text: string): Array<ISSID> {
    let result: Array<ISSID> = [];
    try {
        const ssidsRaw = '(' + text.split('[(')[1].split(')]')[0] + ')';
        result = parseSSIDTuple(ssidsRaw);
    } catch {}
    return result;
}

function parseSSIDTuple(text: string): Array<ISSID> {
    let result: Array<ISSID> = [];

    let rawTupleStrings = text.split('),');

    for (let i = 0; i < rawTupleStrings.length; i++) {
        let tuple = rawTupleStrings[i];
        let tupleParts = tuple.split(',');
        
        const ssid: ISSID =  {
            ssid: tupleParts[0].replace(/\(b'|'/gi, '').trim(),
            bssid: tupleParts[1].replace(/\(b'|'/gi, '').trim(),
            channel: parseInt(tupleParts[2]),
            rssi: parseInt(tupleParts[3]),
            hidden: parseInt(tupleParts[4])
        };
        result.push(ssid);
    }

    return result;
}

export async function writeBoot(microREPL: MicroPythonREPL, ssid: string, password: string) {

        const wifiOnBoot = `import network\n` +
                             `sta_if = network.WLAN(network.STA_IF)\n` +
                             `sta_if.active(True)\n` + 
                             `sta_if.connect('${ssid}', '${password}')\n` +
                             `sta_if.isconnected()\n`;

        try {
            writeFileOnDev(microREPL, '/boot.py', wifiOnBoot, true);
            await delay(800);  // TODO: Cheap code.  
                               //       Wait until file is written.  Feedback would be better
        } catch (error) {
            throw new Error('Failed to write boot.py file.');
        }
}



async function stopWifi(microREPL: MicroPythonREPL) {
        const fileWriteCmd =    `try:\n` +
                                `    import network\n` +
                                `    sta_if = network.WLAN(network.STA_IF)\n` +
                                `    sta_if.active(False)\n` +
                                `except:\n` +
                                `    pass\n`;

    try {
        await microREPL.sendSelectedText(fileWriteCmd);
        await delay(200);
    } catch (error) {
        throw new Error(`Failed to stop WiFi.`);
    }
}



async function notifyUser(microREPL: MicroPythonREPL, message: string): Promise<vscode.Disposable> {
    microREPL.sendSystemMessage(message);
    return vscode.window.setStatusBarMessage(message + '$(sync~spin)');
}
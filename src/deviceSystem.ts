import { window, Terminal } from 'vscode';
import { MicroPythonREPL } from './microPythonREPL';
import * as termCon from './terminalConstants';
import { delay } from './util';
import { ISSID } from './interfaces/SSID';


export function getWifiSSIDInRange(microREPL: MicroPythonREPL): Promise<Array<ISSID>> {
    return new Promise((resolve, reject) => {
        const wifiOnBoot =  `import network\n` +
                            `sta_if = network.WLAN(network.STA_IF)\n` +
                            `sta_if.active(True)\n` + 
                            `sta_if.scan()\n`;
    
        microREPL.captureOutput = true;
        microREPL.showUser = false;
        microREPL.sendSelectedText(wifiOnBoot).then(async (result) => {
            await delay(3000);
            let ssids = parseWifiScanResults(<string>microREPL.captureBuffer);
            microREPL.captureOutput = false;        
            microREPL.showUser = true;
            resolve(ssids);
        }).catch((err) => {
            reject(err);
        });
    });
}

function parseWifiScanResults(text: string): Array<ISSID> {
    let result: Array<ISSID> = [];
    try {
        const ssidsRaw = '(' + text.split('[(')[1].split(')]')[0] + ')';
        result = parseSSIDTuple(ssidsRaw);
    } catch {
        const ssid: ISSID =  {
            ssid: 'None',
            bssid: '',
            channel: -1,
            rssi: -1,
            hidden: -1
        };
        result = [ssid];
    }

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

export function writeBoot(microREPL: MicroPythonREPL, ssid: string, password: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {

        microREPL.showUser = false;

        const wifiOnBoot = `import network\n` +
                             `sta_if = network.WLAN(network.STA_IF)\n` +
                             `sta_if.active(True)\n` + 
                             `sta_if.connect('${ssid}', '${password}')\n` +
                             `sta_if.isconnected()`;

        const fileWriteCMD = createFileWriteToFileString(wifiOnBoot, 'boot.py');

        microREPL.sendSelectedText(fileWriteCMD).then((result) => {
            microREPL.showUser = true;            
            resolve(true);
        }).catch((err) => {
            reject(err);
        });
    });
}

function createFileWriteToFileString(text: string, filename: string, path: string = ''): string {

    let fileWriteCmd = '';
    const rawLines = text.split('\n');
    let filePath = '';
    
    if(path !== '') {
        filePath = path + '/' + filename;
    } else {
        filePath = filename;
    }
    
    fileWriteCmd =  `try:\n` +
                    `    import uos\n` +
                    `    uos.remove("${filePath}")\n` +
                    `except:\n` +
                    `    pass\n`;

                    fileWriteCmd += `with open("${filePath}", "w") as f:` + '\n';
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        fileWriteCmd += `    f.write("` + line + `\\n")`; 
        fileWriteCmd += '\n';
    }
    return fileWriteCmd;
}
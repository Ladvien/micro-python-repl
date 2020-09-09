import { window, Terminal } from 'vscode';
import { MicroPythonREPL } from './microPythonREPL';
import * as termCon from './terminalConstants';
import { delay } from './util';


export function getWifiSSIDInRange(microREPL: MicroPythonREPL): Promise<Array<string>> {

    return new Promise((resolve, reject) => {
        const wifiOnBoot =  `import network\n` +
                            `sta_if = network.WLAN(network.STA_IF)\n` +
                            `sta_if.active(True)\n` + 
                            `sta_if.scan()\n`;
    
        microREPL.captureOutput = true;
        // microREPL.showUser = false;
        microREPL.sendSelectedText(wifiOnBoot).then(async (result) => {
            await delay(3000);
            let ssids = parseWifiScanResults(<string>microREPL.captureBuffer);
            microREPL.captureOutput = false;        
            // microREPL.showUser = true;
            console.log(ssids);
            resolve();
        }).catch((err) => {
            reject(err);
        });
    });
}

function parseWifiScanResults(text: string): Array<string> {
    let result = [''];
    try {
        const ssidsRaw = '(' + text.split('[(')[1].split(')]')[0] + ')';
        result = parseSSIDTuple(ssidsRaw);
    } catch {
        result = ['Unable to find WiFI SSIDs in results.'];
    }
    // `I (3898) network: event 1\n` + 
    // `[(b'SpectrumSetup-D8', b'D\xad\xb1Fp\xde', 6, -73, 3, False), (b'Wireless-N(2.4G)', b'\x0eAX\x11\xcd\xfa', 11, -79, 4, False), (b'ATTXW2QI22', b'\xd4\x04\xcd\xce\xd5\xe0', 11, -89, 3, False), (b'NETGEAR81', b'@]\x82\xd5Hh', 11, -95, 3, False)]\n` 
    // + `>>>`;

    return result;
}

function parseSSIDTuple(text: string): Array<string> {
    let result = [''];

    let rawTupleStrings = text.split('),');

    for (let i = 0; i < rawTupleStrings.length; i++) {
        let tuple = rawTupleStrings[i];
        let tupleParts = tuple.split(',');
        console.log(tupleParts);
        result.push(tuple);
    }

    return result;
}

export function writeBoot(microREPL: MicroPythonREPL, ssid: string, password: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {

        microREPL.showUser = false;

        const wifiOnBoot = `import network\n` +
                             `sta_if = network.WLAN(network.STA_IF)\n` +
                             `sta_if.active(True)\n` + 
                             `sta_if.scan()\n` +
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
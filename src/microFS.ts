import { window, Terminal } from 'vscode';
import { MicroPythonREPL } from './microPythonREPL';
import * as termCon from './terminalConstants';

export function writeBoot(microREPL: MicroPythonREPL, ssid: string, password: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {

        microREPL.showUser = false;

        const wifiOnBoot = `import network\n` +
                             `sta_if = network.WLAN(network.STA_IF)\n` +
                             `sta_if.active(True)\n` + 
                             `sta_if.scan()\n` +
                             `sta_if.connect('${ssid}', '${password}')\n` +
                             `sta_if.isconnected()`;

        const fileWriteCMD = createFileWriteCodeFromText(wifiOnBoot, 'boot.py');

        microREPL.sendSelectedText(fileWriteCMD).then((result) => {
            microREPL.showUser = true;            
            resolve(true);
        }).catch((err) => {
            reject(err);
        });
    });
}

function createFileWriteCodeFromText(text: string, filename: string, path: string = ''): string {

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
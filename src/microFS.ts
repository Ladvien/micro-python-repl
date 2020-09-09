import { window, Terminal } from 'vscode';
import { MicroPythonREPL } from './microPythonREPL';
import * as termCon from './terminalConstants';

export function writeBoot(microREPL: MicroPythonREPL, ssid: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {


        const wifiOnBoot = `import network\n` +
                             `sta_if = network.WLAN(network.STA_IF)\n` +
                             `sta_if.active(True)\n` + 
                             `sta_if.scan()\n` +
                             `sta_if.connect('${ssid}', '${password}')\n` +
                             `sta_if.isconnected()`;

        const fileWriteCMD = createFileWriteCodeFromText(wifiOnBoot, 'boot.py');
        console.log(fileWriteCMD);
        microREPL.sendSelectedText(fileWriteCMD);

        resolve(true);
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

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        if(i === 0) {
            fileWriteCmd += `with open("${filePath}") as f:`;
        } else {
            fileWriteCmd += `    f.write("` + line + `")`; 
        }
        fileWriteCmd += '\n';
    }
    return fileWriteCmd;
}
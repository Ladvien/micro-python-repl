import * as vscode from 'vscode';
import { delay } from './util';
export class REPL {

    terminal: vscode.Terminal;
    portPath: String;
    baudRate: String;
    connected: Boolean;

    constructor(terminal: vscode.Terminal, portPath: String, baudRate: String) {
        this.terminal = terminal;
        this.portPath = portPath;
        this.baudRate = baudRate;
        this.connected = false;

        this.connect().then(() => {
            this.connected = true;
        }).catch((err) => {
            this.connected = false;
        });
    }

    connect() {
        return new Promise(async (resolve, reject) => {
            this.terminal.sendText(`rshell -p ${this.portPath} -b ${this.baudRate}`, true);
            await delay(500);
            this.terminal.sendText(`connect serial`);
            await delay(1100);
            this.terminal.sendText('repl');
            this.terminal.show();
            resolve();
        });

    }
    
}
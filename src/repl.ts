import * as vscode from 'vscode';
import { delay } from './util';

const RSHELL_QUIT    = '\u0018';
const RSHELL_RESET   = '\u0004';
const RSHELL_END     = '\u0003';

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
    }

    connect() {
        return new Promise(async (resolve, reject) => {
            this.terminal.sendText(`rshell -p ${this.portPath} -b ${this.baudRate}`, true);
            await delay(500);
            this.terminal.sendText(`connect serial`);
            await delay(1100);
            this.terminal.sendText('repl');
            this.terminal.show();
            this.connected = true;
            resolve();
        }).catch((err) => {
            this.connected = false;
        });
    }

    async reset() {
        await delay(500);
        this.terminal.sendText(RSHELL_RESET);
    }

    async quit() {
        await delay(500);
        this.terminal.sendText(RSHELL_QUIT);
        await delay(100);
        this.terminal.sendText(RSHELL_END)
        await delay(100);
    }
    
}
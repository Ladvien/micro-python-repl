import * as vscode from 'vscode';
import { delay } from './util';
import { REPLParser } from './replParser';


const RSHELL_QUIT    = '\u0018';
const RSHELL_RESET   = '\u0004';
const RSHELL_END     = '\u0003';

export class REPL {

    terminal: vscode.Terminal;
    portPath: String;
    baudRate: String;
    connected: Boolean;
    currentIndentLevel: number;
    replParser: REPLParser;

    constructor(terminal: vscode.Terminal, portPath: String, baudRate: String) {
        this.terminal = terminal;
        this.portPath = portPath;
        this.baudRate = baudRate;
        this.connected = false;
        this.currentIndentLevel = 0;
        this.replParser = new REPLParser();
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
        this.terminal.sendText(RSHELL_END);
        await delay(100);
    }

    async sendText(terminal: vscode.Terminal, chunk: string) {

        return new Promise(async (resolve) => {
            let preparedLines = this.replParser.prepareChunkToSend(chunk, this.currentIndentLevel);
            for (let i = 0; i < preparedLines.length; i++) {
                const line = preparedLines[i];
                terminal.sendText(<string>line, true);
                await delay(100);
            }
            resolve();
        });


    }


    
}
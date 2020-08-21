import * as vscode from 'vscode';
import { delay } from './util';
import { REPLParser } from './replParser';
import { SerialDevice } from './SerialDevice';
import { rejects } from 'assert';


const RSHELL_QUIT    = '\u0018';
const RSHELL_RESET   = '\u0004';
const RSHELL_END     = '\u0003';

const DELAY_BETWEEN_EXEC = 60;


export class REPL {

    terminal: vscode.Terminal;
    rShellConnected: Boolean;
    replConnected: Boolean;
    currentIndentLevel: number;
    replParser: REPLParser;
    serialDevice: SerialDevice;

    constructor(terminal: vscode.Terminal, serialDevice: SerialDevice) {
        this.terminal = terminal;
        this.rShellConnected = false;
        this.replConnected = false;
        this.currentIndentLevel = 0;
        this.serialDevice = serialDevice;
        this.replParser = new REPLParser();
    }

    isConnected() {
        return (this.rShellConnected && this.replConnected);
    }

    connect(): Promise<boolean> {
        return new Promise(async (resolve) => {
            await this.connectRShell();
            this.connectREPL();
            resolve(true);
        });
    }

    private connectRShell() {
        return new Promise(async (resolve) => {
            this.terminal.sendText(`rshell -p ${this.serialDevice.port} -b ${this.serialDevice.baud}`);
            await delay(1100);
            this.rShellConnected = true;
            resolve();
        });
    }

    private connectREPL() {
        this.terminal.sendText('repl');
        this.terminal.show();
        this.replConnected = true;
    }

    async reset() {
        await delay(500);
        this.terminal.sendText(RSHELL_RESET);
    }

    async quit() {
        return new Promise(async (resolve) => {
            await delay(500);
            this.terminal.sendText(RSHELL_QUIT);
            await delay(100);
            this.terminal.sendText(RSHELL_END);
            await delay(100);
            resolve();
        });
    }

    async sendText(terminal: vscode.Terminal, chunk: string) {

        return new Promise(async (resolve) => {
            let preparedLines = this.replParser.prepareChunkToSend(chunk);
            for (let i = 0; i < preparedLines.length; i++) {
                const line = preparedLines[i];
                terminal.sendText(<string>line);
                await delay(DELAY_BETWEEN_EXEC);
            }
            resolve();
        });
    }
    
}
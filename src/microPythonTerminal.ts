import * as vscode from 'vscode';
import { delay } from './util';
import { REPLParser } from './replParser';
import { ISerialDevice } from './SerialDevice';
import { SerialConnection } from './serialConnection';
import * as termCon from './terminalConstants';
import { resolve } from 'path';

const EventEmitter = require('events');
// https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html

export class MicroPythonTerminal {

    
    welcomeMsg: string;
    replReady: boolean;
    replConnected: Boolean;
    rxBuffer: String;
    txBuffer: String;

    replParser: REPLParser;
    serialDevice: ISerialDevice;
    serialConnection: SerialConnection;
    eventEmitter: typeof EventEmitter;
    writeEmitter: vscode.EventEmitter<string>;

    constructor(serialDevice: ISerialDevice) {

        this.serialDevice = serialDevice;
        this.welcomeMsg = 'Welcome to MicroPython Terminal\r\n';
        this.replReady = true;
        this.rxBuffer = '';
        this.txBuffer = '';
                        
        this.writeEmitter = new vscode.EventEmitter<string>();
        const pty: vscode.Pseudoterminal = {
            onDidWrite: this.writeEmitter.event,
            open: () => this.open(),
            close: () => this.close(),
            handleInput: data => this.userInput(data),
        };
        vscode.window.createTerminal({ name: 'MicroPython', pty });

        this.replConnected = false;
        this.eventEmitter = new EventEmitter();
        this.eventEmitter.on('onRead', (data: Buffer) => this.onRead(data));

        this.serialConnection = new SerialConnection(serialDevice, this.eventEmitter);
        this.replParser = new REPLParser();
        this.serialConnection.open();
    }

    async open() {
        await delay(termCon.DELAY_BEFORE_WELCOME);
        this.sendText(termCon.CLEAR_ALL);
        this.sendText(this.welcomeMsg);
        await this.reset();
    }

    close() {
        console.log("MicroPy Term closed.");
    }

    clearScreen() {
        this.sendText(termCon.CLEAR_ALL);
        this.sendText(termCon.RESET_CUR);
    }

    onRead(data: Buffer) {
        const line = data.toString('utf8');
        this.rxBuffer += line;
        if (this.rxBuffer.includes('>>>')) { 
            this.replReady = true;
            this.rxBuffer = '';
            console.log('Terminal ready.');
        }
        this.sendOutput(data.toString('utf8'));
    }

    userInput(line: string){
        this.sendInput(line);
    }

    sendText(line: string) {
        this.writeEmitter.fire(line);
    }

    async sendSelectedText(chunk: String) {
        return new Promise(async (resolve) => {
            let lines = this.replParser.prepareInputChunk(chunk);
            let i = 0;
            while(i !== lines.length) {
                const line = lines[i];
                if(this.replReady) {
                    this.sendInput(<string>line);
                    await delay(150);
                    i++;
                } else {
                    console.log('waited');
                    await delay(500);
                }
            }
        });
    }

    async sendOutput(line: String) {
        this.sendText(<string>line);
    }

    sendInput(chunk: string) {
        this.serialConnection.write(<string>chunk);
    }

    shutdown(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }

    async reset() {
        await this.serialConnection.reset();
    }

    checkIfMicroPyTermExists(terminals: readonly vscode.Terminal[]): boolean {
        return undefined !== this.selectMicroPythonTerm(terminals);
    }
    
    ensureTerminalExists(): boolean {
        if ((<any>vscode.window).terminals.length === 0) {
            vscode.window.showErrorMessage('No active terminals');
            return false;
        }
        return true;
    }
    
    selectMicroPythonTerm(terminals: readonly vscode.Terminal[]): Promise<vscode.Terminal> {
        return new Promise(async (resolve) => {
            console.log('here');
            if (undefined === terminals.find(term => term.name === 'MicroPython')) {
                const terminal = vscode.window.createTerminal({
                    name: `MicroPython`,
                    hideFromUser: true
                } as any);
                await delay(1000);
                resolve(terminal);
            } else {
                resolve(<vscode.Terminal>terminals.find(term => term.name === 'MicroPython'));
            }
        });
    }

}


import * as vscode from 'vscode';
import { delay } from './util';
import { REPLParser } from './replParser';
import { ISerialDevice } from './SerialDevice';
import { SerialConnection } from './serialConnection';
import * as termCon from './terminalConstants';
import * as fs from 'fs';

const EventEmitter = require('events');
// https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html

export class MicroPythonTerminal {

    
    welcomeMsg: string;
    replReady: boolean;
    replConnected: Boolean;
    rxBuffer: String;
    txBuffer: String;
    logPath: String;

    replParser: REPLParser;
    serialDevice: ISerialDevice;
    serialConnection: SerialConnection;
    eventEmitter: typeof EventEmitter;
    writeEmitter: vscode.EventEmitter<string>;

    constructor(serialDevice: ISerialDevice, logPath: string = "") {

        this.serialDevice = serialDevice;
        this.logPath = logPath;
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
        if (this.rxBuffer.includes('>>>') || this.rxBuffer.includes('...')) { 
            this.replReady = true;
            this.rxBuffer = '';
        }
        this.sendOutput(data.toString('utf8'));
    }

    userInput(line: string){
        this.sendInput(line);
    }

    sendText(line: string) {
        this.writeEmitter.fire(line);
    }

    async sendSelectedText(chunk: String): Promise<String> {
        return new Promise(async (resolve) => {
            let lines = this.replParser.prepareInputChunk(chunk);
            let i = 0;
            while(i !== lines.length) {
                const line = lines[i];
                if(this.replReady) {
                    this.sendInput(<string>line);
                    this.replReady = false;
                    await delay(30);
                    i++;
                } else {
                    await delay(200);
                }
            }
            resolve();
        });
    }

    async sendOutput(line: String) {
        this.sendText(<string>line);
    }

    sendInput(chunk: string) {
        if(this.logPath !== ''){ this.log(chunk); }
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

    clearLog() {
        fs.writeFileSync(<string>this.logPath, "");
    }
    
    log(line: String) {
        line = this.nonAsciiToHex(line);
        try{
            if (fs.existsSync(<string>this.logPath)) {
                fs.appendFileSync(<string>this.logPath, line);
            } else {
                fs.writeFileSync(<string>this.logPath, line);
            }
        } catch (err) {

        }
    }

    nonAsciiToHex(line: String): String {
        let parsedString = "";
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const rawChar = char.charCodeAt(0);
            if (rawChar >= 32 && rawChar < 127 || rawChar === 10) {
                parsedString += char;
            } else {
                parsedString += '0x' + rawChar.toString(16);
            }
        }
        return parsedString;
    }
    

}


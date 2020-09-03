import * as vscode from 'vscode';
import { delay } from './util';
import { REPLParser } from './replParser';
import { MicroPythonTerminal } from './microPythonTerminal';
import { ISerialDevice } from './SerialDevice';
import { SerialConnection } from './serialConnection';
import * as termCon from './terminalConstants';
import * as fs from 'fs';

const EventEmitter = require('events');
// https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html

export class MicroPythonREPL {

    TRIES_WAITING_FOR_READY = 10;
    DELAY_BETWEEN_READY_TRIES = 300;

    DELAY_BETWEEN_SEND_TEXT = 30;
    DELAY_FOR_READY_DURING_SEND_TEXT = 300;
    
    replReady: boolean;
    rxBuffer: String;
    logPath: String;

    replParser: REPLParser;
    microPyTerm: MicroPythonTerminal;
    serialDevice: ISerialDevice;
    serialConnection: SerialConnection;
    
    serialConnectEmitter: typeof EventEmitter;
    microPyTermEmitter: typeof EventEmitter;

    constructor(serialDevice: ISerialDevice, logPath: string = "") {
        this.replReady = false;
        this.serialDevice = serialDevice;
        this.logPath = logPath;
        this.rxBuffer = '';
        this.microPyTermEmitter = this.setupMicroPythonTerminalEmitter();
        this.serialConnectEmitter = this.setupSerialConnectionEmitter();
        
        this.replParser = new REPLParser();
        this.serialConnection = new SerialConnection(serialDevice, this.serialConnectEmitter);
        this.microPyTerm = new MicroPythonTerminal(this.microPyTermEmitter);
    }

    async waitForReady(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            for (let index = 0; index < this.TRIES_WAITING_FOR_READY; index++) {
                if(this.serialConnection && this.replReady) { resolve(true); }
                await delay(this.DELAY_BETWEEN_READY_TRIES);
            } 
            reject(false);
        });
    }

    close() {
        this.serialConnection.close();
        vscode.window.showInformationMessage('MicroPy Term closed.');
        this.replReady = false;
    }

    async reset() {
        await this.serialConnection.reset();
    }
    
    async sendSelectedText(chunk: String): Promise<String> {
        return new Promise(async (resolve) => {

            if(!this.serialConnection.connected) {
                this.serialConnection.open();
            }

            let lines = this.replParser.prepareInputChunk(chunk);
            let i = 0;
            while(i !== lines.length) {
                const line = lines[i];
                if(this.replReady) {
                    await this.writeToDevice(<string>line);
                    this.replReady = false;
                    await delay(this.DELAY_BETWEEN_SEND_TEXT);
                    i++;
                } else {
                    await delay(this.DELAY_FOR_READY_DURING_SEND_TEXT);
                }
            }
            resolve();
        });
    }

    clearLog() {
        fs.writeFileSync(<string>this.logPath, "");
    }

    private clearScreen() {
        this.sendToDisplay(termCon.CLEAR_ALL);
        this.sendToDisplay(termCon.RESET_CUR);
    }

    private onReadSerialData(data: Buffer) {
        const line = data.toString('utf8');
        this.log(line);
        this.rxBuffer += line;
        if (this.rxBuffer.includes('>>>') || this.rxBuffer.includes('...')) { 
            this.replReady = true;
            this.rxBuffer = '';
        }
        this.sendToDisplay(data.toString('utf8'));
    }

    private async writeToDevice(chunk: string) {
        if(this.logPath !== ''){ this.log(chunk); }
        this.serialConnection.write(<string>chunk);
    }

    private sendSystemMessageToDisplay(line: string) {
        this.microPyTerm.sendToTerminal(line);
    }

    private sendToDisplay(line: string) {
        this.microPyTerm.sendToTerminal(line);
    }
    
    private log(line: String) {
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

    private nonAsciiToHex(line: String): String {
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
	
	private async onOpenSerialConnection(){
        vscode.window.setStatusBarMessage(`Opened ${this.serialDevice.port} at ${this.serialDevice.baud}`);
        await this.serialConnection.reset();
	}

	private onDisconnectedSerialDevice() {
        this.lostConnection('Device disconnected unexpectedly.');
	}

	private onCloserSerialDevice() {
       this.lostConnection('Lost connection to device.');
    }

    private lostConnection(message: string) {
        vscode.window.setStatusBarMessage(`${message}`);
        this.microPyTerm.sendToTerminal(`${termCon.EXEC}${termCon.RED}${message}${termCon.RESET_COLOR}${termCon.EXEC}`);
        this.microPyTerm.sendToTerminal(`Press space to try and reconnect.${termCon.EXEC}`);
    }
    
    private onSerialConnectionFailedToOpen(message: String) {
        this.microPyTerm.sendToTerminal(`${termCon.EXEC}${termCon.RED}Device at path ${this.serialDevice.port} not connected.${termCon.RESET_COLOR}${termCon.EXEC}`);
        this.microPyTerm.sendToTerminal(`Press space to try and reconnect.${termCon.EXEC}`);
    }

    private welcomeMessage() {
        const message = 'Welcome to MicroPython Terminal for VSCode.';
        this.microPyTerm.sendToTerminal(`${termCon.EXEC}${termCon.PURPLE}${message}${termCon.RESET_COLOR}${termCon.EXEC}`);
    }

    private setupSerialConnectionEmitter(): typeof EventEmitter {
        let eventEmitter = new EventEmitter();
        eventEmitter.on('onRead', (data: Buffer) => this.onReadSerialData(data));
        eventEmitter.on('onOpen', () => this.onOpenSerialConnection());
        eventEmitter.on('onDisconnect', () => this.onDisconnectedSerialDevice());
        eventEmitter.on('onClose', () => this.onCloserSerialDevice());
        eventEmitter.on('onFailedOpen', (message: String) => this.onSerialConnectionFailedToOpen(message));
        return eventEmitter;
    }

    private setupMicroPythonTerminalEmitter(): typeof EventEmitter {
        let eventEmitter = new EventEmitter();
        eventEmitter.on('terminalOpen', () => this.terminalOpen());
        eventEmitter.on('termGotUserInput', (text: String) => this.gotUserInput(text));
        eventEmitter.on('terminalClosed', () => this.terminalClosed());
        return eventEmitter;
    }

    private terminalClosed() {
        this.replReady = false;
    }

    private async gotUserInput(text: String) {
        if(!this.serialConnection.connected && text === ' ') { 
            this.serialConnection.open(); 
            return;
        }
        this.writeToDevice(<string>text);
    }

    private terminalOpen() {
        this.clearScreen();
        this.welcomeMessage();
        this.serialConnection.open();
    }
}


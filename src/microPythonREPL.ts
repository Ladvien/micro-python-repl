import * as vscode from 'vscode';
import { delay } from './util';
import { REPLParser } from './replParser';
import { MicroPythonTerminal } from './microPythonTerminal';
import { ISerialDevice } from './interfaces/SerialDevice';
import { SerialConnection } from './serialConnection';
import * as fs from 'fs';
import { Constants } from './terminalConstants';

const EventEmitter = require('events');
// https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html

export class MicroPythonREPL {

    TRIES_WAITING_FOR_READY = 10;
    DELAY_BETWEEN_READY_TRIES = 300;

    DELAY_BETWEEN_SEND_TEXT = 30;
    DELAY_FOR_READY_DURING_SEND_TEXT = 300;

    showUser: boolean = true;
    captureOutput: boolean = false;
    replReady: boolean = false;
    rxBuffer: String = '';
    private captureBuffer: String = '';
    logPath: String;

    replParser: REPLParser;
    upyTerminal: MicroPythonTerminal | undefined;
    serialDevice: ISerialDevice;
    serialConnection: SerialConnection;
    
    serialConnectEmitter: typeof EventEmitter;
    upyTerminalEmitter: typeof EventEmitter;
    constants: Constants;



    constructor(upyTerminal: MicroPythonTerminal, serialDevice: ISerialDevice, constants: Constants, logPath: string = "") {
        this.serialDevice = serialDevice;
        this.logPath = logPath;

        this.upyTerminalEmitter = this.setupMicroPythonTerminalEmitter();
        this.serialConnectEmitter = this.setupSerialConnectionEmitter();
        this.attachTerminal(upyTerminal);
        this.replParser = new REPLParser(constants);
        this.serialConnection = new SerialConnection(serialDevice, this.serialConnectEmitter);
        this.constants = constants;
    }

    attachTerminal(upyTerminal: MicroPythonTerminal){
        this.upyTerminal = upyTerminal;
        upyTerminal.eventEmitter = this.upyTerminalEmitter;
    }

    isMicroREPLReady(){
        if(this.upyTerminal=== undefined) { return false; }
        return (this.serialConnection.connected && this.upyTerminal.terminalShowing && this.replReady);
    }

    openSerialConnection() {
        this.serialConnection.open();
    }

    async waitForReady(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if(this.serialConnection === undefined) { reject('serialConnect is undefined.'); } 
            for (let index = 0; index < this.TRIES_WAITING_FOR_READY; index++) {
                if(this.isMicroREPLReady()) { resolve(true); }
                await delay(this.DELAY_BETWEEN_READY_TRIES);
            } 
            reject(Error(`waitForReady failed. serialConnect is ${this.serialConnection.connected}, replReady is ${this.replReady}, upyTerminalReady ${this.upyTerminal?.terminalShowing}`));
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            vscode.window.setStatusBarMessage(`MicroREPL closed at ${this.serialDevice.port}`);
            this.replReady = false;
            this.serialConnection.close().then((closedDevPath) => {
                resolve(closedDevPath);
            }).catch((err) => {
                reject(err);
            });
        });
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
                if(this.isMicroREPLReady()) {
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
        fs.writeFileSync(<string>this.logPath, '');
    }

    sendSystemMessage(message: string, clearScreen = false) {
        if(clearScreen) { this.clearScreen(); }
        this.sendToDisplay(`${this.constants.CLEAR_LINE}${this.constants.PURPLE}${message}${this.constants.RESET_COLOR}\n\r`);
    }

    getREPLPrompt() {
        this.writeToDevice(`${this.constants.EXEC}`);
    }
    
    getCaptureBuffer() {
        const tmp = <string>this.captureBuffer;
        this.captureBuffer = '';
        return tmp;
    }

    private clearScreen() {
        this.sendToDisplay(this.constants.CLEAR_ALL);
        this.sendToDisplay(this.constants.RESET_CUR);
    }

    private onReadSerialData(data: Buffer) {
        const line = data.toString('utf8');
        if(this.logPath !== ''){ this.log(line); }
        this.rxBuffer += line;
        if (this.rxBuffer.includes('>>>') || this.rxBuffer.includes('...')) { 
            this.replReady = true;
            this.rxBuffer = '';
        }
        if(this.captureOutput){ this.captureBuffer += data.toString('utf8'); }
        if(this.showUser) { this.sendToDisplay(data.toString('utf8')); };
    }

    private async writeToDevice(chunk: string) {
        this.serialConnection.write(<string>chunk);
    }

    private sendToDisplay(line: string) {
        if(this.upyTerminal) {
            this.upyTerminal.sendToTerminal(line);
        }
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
            vscode.window.showErrorMessage(`Unable to log to ${this.logPath}`);
        }
    }

    private nonAsciiToHex(line: String): String {
        let parsedString = "";
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const rawChar = char.charCodeAt(0);
            if (rawChar >= 32 && rawChar < 127 || 10) {
                parsedString += char;
            } else {
                let prefix = '0x';
                if(rawChar < 16){ prefix = '0x0'; }
                parsedString += prefix + rawChar.toString(16) + ' ';
            }
        }
        return parsedString;
    }
	
	private async onOpenSerialConnection(){
        await this.serialConnection.reset();
	}

	private onDisconnectedSerialDevice() {
        this.lostConnection('Device disconnected unexpectedly.');
	}

	private onCloserSerialDevice() {
       this.lostConnection('Lost connection to device.');
    }

    private lostConnection(message: string) {
        if(this.upyTerminal){
            this.upyTerminal.sendToTerminal(`${this.constants.EXEC}${this.constants.RED}${message}${this.constants.RESET_COLOR}${this.constants.EXEC}`);
            this.upyTerminal.sendToTerminal(`Press space to try and reconnect.${this.constants.EXEC}`);
        } else {
            vscode.window.setStatusBarMessage(`${message}`);
        }
    }
    
    private onSerialConnectionFailedToOpen(message: String) {
        if(this.upyTerminal){
            this.upyTerminal.sendToTerminal(`${this.constants.EXEC}${this.constants.RED}Device at path ${this.serialDevice.port} not connected.${this.constants.RESET_COLOR}${this.constants.EXEC}`);
            this.upyTerminal.sendToTerminal(`Press space to try and reconnect.${this.constants.EXEC}`);
        } else {
            vscode.window.setStatusBarMessage(`${message}`);
        }
    }

    private welcomeMessage() {
        const message = this.constants.WELCOME_MESSAGE;
        if(this.upyTerminal) {
            this.upyTerminal.sendToTerminal(`${this.constants.EXEC}${this.constants.PURPLE}${message}${this.constants.RESET_COLOR}${this.constants.EXEC}`);
        }
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
        return eventEmitter;
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
        // this.serialConnection.open();
    }
}


import * as vscode from 'vscode';
import { delay, selectMicroPythonTerm } from './util';
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
    rxBuffer: String;
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
                        
        this.writeEmitter = new vscode.EventEmitter<string>();
        const pty: vscode.Pseudoterminal = {
            onDidWrite: this.writeEmitter.event,
            open: () => this.open(),
            close: () => this.close(),
            handleInput: data => this.writeToDevice(data),
        };
        vscode.window.createTerminal({ name: 'MicroPython', pty });
        this.eventEmitter = this.setupEmitter();

        this.serialConnection = new SerialConnection(serialDevice, this.eventEmitter);
        this.replParser = new REPLParser();
        this.serialConnection.open();
    }

    async open() {
        await delay(termCon.DELAY_BEFORE_WELCOME);
        this.sendToDisplay(termCon.CLEAR_ALL);
        this.sendToDisplay(this.welcomeMsg);
        await this.reset();
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
            let lines = this.replParser.prepareInputChunk(chunk);
            let i = 0;
            while(i !== lines.length) {
                const line = lines[i];
                if(this.replReady) {
                    this.writeToDevice(<string>line);
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

    clearLog() {
        fs.writeFileSync(<string>this.logPath, "");
    }

    private clearScreen() {
        this.sendToDisplay(termCon.CLEAR_ALL);
        this.sendToDisplay(termCon.RESET_CUR);
    }

    private onRead(data: Buffer) {
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
        if(this.serialConnection.connected) {
            this.serialConnection.write(<string>chunk);
        } else {
            await this.checkForReconnect(chunk);
        }
    }

    private async checkForReconnect(chunk: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if(chunk === ' '){
                if(!await this.serialConnection.isDeviceConnected()) { 
                    console.log('ere');
                    this.deviceNotConnected(); 
                    reject(false);
                }
                console.log('resetting');
                this.serialConnection.open();
                await this.reset();
                resolve(true);
            }
        });
    }

    private sendToDisplay(line: string) {
        if(this.serialConnection.connected) {
            this.writeEmitter.fire(line);
            console.log(line);
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
	
	private onOpen(){
		vscode.window.setStatusBarMessage(`Opened ${this.serialDevice.port} at ${this.serialDevice.baud}`);
	}

	private onDisconnect() {
        this.lostConnection('Device disconnected unexpectedly.');
	}

	private onClose() {
       this.lostConnection('Lost connection to device.');
	}
	
	private onError(err: Error) {
        console.log(err.name);
		this.lostConnection('Device closed unexpectedly.');
    }
    
    private lostConnection(message: string) {
        vscode.window.setStatusBarMessage(`${message}`);
        this.writeEmitter.fire(`${termCon.EXEC}${termCon.RED}${message}${termCon.RESET_COLOR}${termCon.EXEC}`);
        this.writeEmitter.fire(`Press space to try and reconnect.${termCon.EXEC}`);
    }

    private deviceNotConnected() {
        this.writeEmitter.fire(`${termCon.EXEC}${termCon.RED}Device at path ${this.serialDevice.port} not connected.${termCon.RESET_COLOR}${termCon.EXEC}`);
        this.writeEmitter.fire(`Press space to try and reconnect.${termCon.EXEC}`);
    }

    private setupEmitter(): typeof EventEmitter {
        let eventEmitter = new EventEmitter();
        eventEmitter.on('onRead', (data: Buffer) => this.onRead(data));
        eventEmitter.on('onDisconnect', () => this.onDisconnect());
        eventEmitter.on('onClose', () => this.onClose());
        eventEmitter.on('onError', (err: Error) => this.onError(err));
        return eventEmitter;
    }
}


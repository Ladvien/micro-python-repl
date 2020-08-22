import * as vscode from 'vscode';
import { delay } from './util';
import { REPLParser } from './replParser';
import { ISerialDevice } from './SerialDevice';
import { SerialConnection } from './serialConnection';
import * as termCon from './terminalConstants';

const EventEmitter = require('events');
// https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html



export class MicroPythonTerminal {

    
    welcomeMsg: string;
    replConnected: Boolean;
    currentIndentLevel: number;
    columnIndex: number;
    replParser: REPLParser;
    serialDevice: ISerialDevice;
    serialConnection: SerialConnection;
    eventEmitter: typeof EventEmitter;
    writeEmitter: vscode.EventEmitter<string>;

    constructor(serialDevice: ISerialDevice) {

        this.serialDevice = serialDevice;

        this.welcomeMsg = 'Welcome to MicroPython Terminal\r\n' +
                           '>>> ';
        this.columnIndex = 0;                           
        this.writeEmitter = new vscode.EventEmitter<string>();
        const pty: vscode.Pseudoterminal = {
            onDidWrite: this.writeEmitter.event,
            open: () => this.open(),
            close: () => this.close(),
            handleInput: data => this.userInput(data),
        };
        vscode.window.createTerminal({ name: 'MicroPython', pty });

        this.replConnected = false;
        this.currentIndentLevel = 0;
        this.eventEmitter = new EventEmitter();
        this.eventEmitter.on('onRead', (data: Buffer) => this.serialConnection.onRead(data));

        this.serialConnection = new SerialConnection(serialDevice, this.eventEmitter);
        this.replParser = new REPLParser();

        this.serialConnection.open();
    }

    async open() {
        await delay(termCon.DELAY_BEFORE_WELCOME);
        this.sendText(termCon.CLEAR_ALL);
        this.sendText(this.welcomeMsg);
        this.columnIndex = 4;
    }

    close() {
        console.log("MicroPy Term closed.");
    }

    clearScreen() {
        this.sendText(termCon.CLEAR_ALL);
        this.sendText(termCon.RESET_CUR);
    }

    async userInput(line: string){
        let parseResults = this.replParser.parseInput(line, this.columnIndex);
        this.columnIndex = <number>parseResults.columnIndex;
        // if(line.endsWith(this.EXEC)) {
        //     line += ">>> ";
        // }
        this.sendText(<string>parseResults.line);
    }

    async sendOutput(line: String) {
        this.sendText(<string>line);
    }

    async sendInput(chunk: string): Promise<string> {
        return new Promise(async (resolve) => {
            let preparedLines = this.replParser.prepareInputChunk(chunk);
            for (let i = 0; i < preparedLines.length; i++) {
                const line = preparedLines[i];
                this.sendText(<string>line);
                this.serialConnection.write(<string>line);
                await delay(termCon.DELAY_BETWEEN_EXEC);
            }
            resolve('sent');
        });
    }

    sendText(line: string) {
        this.writeEmitter.fire(line);
    }

    toHex(str: string) {
        var result = '';
        for (var i=0; i<str.length; i++) {
          result += str.charCodeAt(i).toString(16) + ' ';
        }
        return result;
    }


    shutdown(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }

    private debugSend(data: string, sendStr: string) {
        console.log(this.toHex(sendStr));
        console.log(this.toHex(data));
    }

}


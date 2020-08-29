import * as vscode from 'vscode';
const EventEmitter = require('events');

import { delay } from './util';
import * as termCon from './terminalConstants';
import * as fs from 'fs';

export class MicroPythonTerminal {

    eventEmitter: typeof EventEmitter;
    writeEmitter = new vscode.EventEmitter<string>();

    constructor(emitter: typeof EventEmitter) {
        this.eventEmitter = emitter;
        const pty: vscode.Pseudoterminal = {
            onDidWrite: this.writeEmitter.event,
            open: () =>  this.onOpen(),
            close: () => this.onClose(),
            handleInput: data => this.onUserInput(data)
        };

        vscode.window.createTerminal({ name: 'MicroPython', pty });
    }

    sendToTerminal(text: String) {
        this.writeEmitter.fire(<string>text);
    }

    private onOpen() {
        this.eventEmitter.emit('terminalOpen');
    }
    
    private onUserInput(text: String) {
        this.eventEmitter.emit('termGotUserInput', text);
    }

    private onClose() {
        this.eventEmitter.emit('terminalClosed');
    }

}